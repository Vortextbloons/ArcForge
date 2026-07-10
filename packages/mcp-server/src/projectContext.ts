import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseProjectManifest,
  parseScene,
  CORE_COMPONENTS,
  type ProjectManifest,
  type Scene,
} from "@arcforge/schemas";
import { typecheckScripts } from "@arcforge/engine";
import {
  buildDocIndex,
  type DocIndex,
} from "@arcforge/docs-indexer";
import type { McpPolicy } from "./auth/policyTypes.js";
import { loadOrCreatePolicy } from "./auth/permissions.js";
import { AuditLog } from "./auth/audit.js";
import { DiffLog } from "./diff/diffLog.js";
import { ProjectMutator } from "./mutations/projectMutator.js";
import { PreviewSession } from "./preview/previewSession.js";

export interface SceneSummary {
  path: string;
  name: string;
  entityCount: number;
  entities: Array<{
    id: string;
    name: string;
    parent: string | null;
    components: string[];
  }>;
}

export interface ProjectValidationResult {
  ok: boolean;
  errors: Array<{ code: string; message: string; path?: string }>;
  warnings: Array<{ code: string; message: string; path?: string }>;
}

export interface ProjectContext {
  projectRoot: string;
  readonly: boolean;
  /** Auto-approve policy "ask" in headless mode (--write). */
  approveAsks: boolean;
  attached: boolean;
  clientId: string;
  engineDocsRoot: string | null;
  manifest: ProjectManifest;
  docs: DocIndex;
  policy: McpPolicy;
  audit: AuditLog;
  diffs: DiffLog;
  mutator: ProjectMutator;
  preview: PreviewSession;
  listScenes(): Promise<Array<{ path: string; name: string; entityCount: number }>>;
  openScene(scenePath: string): Promise<SceneSummary>;
  readScene(scenePath: string): Promise<Scene>;
  listComponents(): Array<{
    id: string;
    displayName: string;
    summary: string;
  }>;
  getErrors(): Promise<ProjectValidationResult>;
  refreshDocs(): Promise<DocIndex>;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(
  root: string,
  predicate: (rel: string) => boolean
): Promise<string[]> {
  const results: string[] = [];
  if (!(await pathExists(root))) return results;

  async function walk(current: string, rel = ""): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextRel = rel ? `${rel}/${entry.name}` : entry.name;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full, nextRel);
      else if (entry.isFile() && predicate(nextRel.replace(/\\/g, "/"))) {
        results.push(nextRel.replace(/\\/g, "/"));
      }
    }
  }

  await walk(root);
  return results;
}

function normalizeScenePath(scenePath: string): string {
  return scenePath.replace(/\\/g, "/").replace(/^\/+/, "");
}

export async function resolveEngineDocsRoot(
  explicit?: string
): Promise<string | null> {
  if (explicit && (await pathExists(explicit))) return path.resolve(explicit);

  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../../../docs"),
    path.resolve(process.cwd(), "docs"),
  ];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }
  return null;
}

/**
 * Create a headless project context for MCP tools.
 */
export async function createProjectContext(options: {
  projectRoot: string;
  readonly?: boolean;
  approveAsks?: boolean;
  attached?: boolean;
  clientId?: string;
  engineDocsRoot?: string;
}): Promise<ProjectContext> {
  const projectRoot = path.resolve(options.projectRoot);
  const manifestPath = path.join(projectRoot, "project.threeforge.json");
  if (!(await pathExists(manifestPath))) {
    throw new Error(`project.threeforge.json not found in ${projectRoot}`);
  }

  const raw = JSON.parse(await fs.readFile(manifestPath, "utf8")) as unknown;
  const manifest = parseProjectManifest(raw);
  const engineDocsRoot = await resolveEngineDocsRoot(options.engineDocsRoot);
  const policy = await loadOrCreatePolicy(projectRoot);

  const loadDocs = async () =>
    buildDocIndex({
      projectRoot,
      engineDocsRoot: engineDocsRoot ?? undefined,
      includeComponentSchemas: true,
    });

  let docs = await loadDocs();

  const ctx: ProjectContext = {
    projectRoot,
    readonly: options.readonly !== false,
    approveAsks: Boolean(options.approveAsks),
    attached: Boolean(options.attached),
    clientId: options.clientId ?? "local-mcp",
    engineDocsRoot,
    manifest,
    policy,
    audit: new AuditLog(projectRoot),
    diffs: new DiffLog(projectRoot),
    mutator: new ProjectMutator(projectRoot),
    preview: new PreviewSession(projectRoot),
    get docs() {
      return docs;
    },

    async listScenes() {
      const files = await listFiles(
        projectRoot,
        (rel) => rel.startsWith("scenes/") && rel.endsWith(".scene.json")
      );
      const out = [];
      for (const rel of files) {
        const abs = path.join(projectRoot, ...rel.split("/"));
        try {
          const scene = parseScene(
            JSON.parse(await fs.readFile(abs, "utf8")) as unknown
          );
          out.push({
            path: rel,
            name: scene.name,
            entityCount: scene.entities.length,
          });
        } catch {
          out.push({ path: rel, name: "(invalid)", entityCount: 0 });
        }
      }
      return out.sort((a, b) => a.path.localeCompare(b.path));
    },

    async readScene(scenePath: string) {
      const rel = normalizeScenePath(scenePath);
      if (!rel.startsWith("scenes/") || rel.includes("..")) {
        throw new Error(`Invalid scene path: ${scenePath}`);
      }
      const abs = path.join(projectRoot, ...rel.split("/"));
      if (!(await pathExists(abs))) {
        throw new Error(`Scene not found: ${rel}`);
      }
      return parseScene(JSON.parse(await fs.readFile(abs, "utf8")) as unknown);
    },

    async openScene(scenePath: string) {
      const rel = normalizeScenePath(scenePath);
      const scene = await ctx.readScene(rel);
      return {
        path: rel,
        name: scene.name,
        entityCount: scene.entities.length,
        entities: scene.entities.map((e) => ({
          id: e.id,
          name: e.name,
          parent: e.parent,
          components: Object.keys(e.components),
        })),
      };
    },

    listComponents() {
      return CORE_COMPONENTS.map((c) => ({
        id: c.id,
        displayName: c.displayName,
        summary: c.docs.summary,
      }));
    },

    async getErrors() {
      const errors: ProjectValidationResult["errors"] = [];
      const warnings: ProjectValidationResult["warnings"] = [];

      const sceneFiles = await listFiles(
        projectRoot,
        (rel) => rel.startsWith("scenes/") && rel.endsWith(".scene.json")
      );

      const scriptPaths = new Set<string>();

      for (const rel of sceneFiles) {
        const abs = path.join(projectRoot, ...rel.split("/"));
        try {
          const scene = parseScene(
            JSON.parse(await fs.readFile(abs, "utf8")) as unknown
          );
          const ids = new Set<string>();
          for (const entity of scene.entities) {
            if (ids.has(entity.id)) {
              errors.push({
                code: "duplicate-entity",
                message: `Duplicate entity id "${entity.id}"`,
                path: rel,
              });
            }
            ids.add(entity.id);

            const behaviour = entity.components["script.behaviour"];
            if (
              behaviour &&
              typeof behaviour === "object" &&
              "module" in behaviour &&
              typeof (behaviour as { module: unknown }).module === "string"
            ) {
              scriptPaths.add((behaviour as { module: string }).module);
            }
          }
          for (const entity of scene.entities) {
            if (entity.parent && !ids.has(entity.parent)) {
              errors.push({
                code: "missing-parent",
                message: `Entity "${entity.id}" parent "${entity.parent}" not found`,
                path: rel,
              });
            }
          }
        } catch (err) {
          errors.push({
            code: "invalid-scene",
            message: err instanceof Error ? err.message : "Invalid scene",
            path: rel,
          });
        }
      }

      const defaultScene = manifest.defaultScene.replace(/\\/g, "/");
      if (!sceneFiles.includes(defaultScene)) {
        errors.push({
          code: "missing-default-scene",
          message: `Default scene not found: ${defaultScene}`,
          path: defaultScene,
        });
      }

      const scriptSources = [];
      for (const rel of [...scriptPaths].sort()) {
        if (!rel.startsWith("scripts/") || rel.includes("..")) {
          errors.push({
            code: "unsafe-script-path",
            message: `Unsafe script path: ${rel}`,
            path: rel,
          });
          continue;
        }
        const abs = path.join(projectRoot, ...rel.split("/"));
        if (!(await pathExists(abs))) {
          errors.push({
            code: "missing-script",
            message: `Script not found: ${rel}`,
            path: rel,
          });
          continue;
        }
        scriptSources.push({
          path: rel,
          source: await fs.readFile(abs, "utf8"),
        });
      }

      const typecheck = typecheckScripts(scriptSources);
      for (const diag of typecheck.diagnostics) {
        const item = {
          code: "script-typecheck",
          message: diag.message,
          path: diag.file,
        };
        if (diag.severity === "error") errors.push(item);
        else warnings.push(item);
      }

      return {
        ok: errors.length === 0,
        errors,
        warnings,
      };
    },

    async refreshDocs() {
      docs = await loadDocs();
      return docs;
    },
  };

  return ctx;
}
