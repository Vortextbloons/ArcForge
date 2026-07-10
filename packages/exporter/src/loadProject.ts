import { promises as fs } from "node:fs";
import path from "node:path";
import {
  parsePrefab,
  parseProjectManifest,
  parseScene,
  type Prefab,
  type Scene,
} from "@arcforge/schemas";
import {
  listFiles,
  pathExists,
  readJsonFile,
  resolveUnderRoot,
  toPosix,
  issue,
} from "./fsUtils.js";
import type {
  CollectedPrefab,
  CollectedScene,
  CollectedScript,
  ExportIssue,
  ProjectBundle,
} from "./types.js";

const ASSET_KEYS = new Set(["asset", "src", "url", "path", "texture", "model"]);

function collectAssetRefs(value: unknown, out: Set<string>): void {
  if (typeof value === "string") {
    const posix = toPosix(value);
    if (posix.startsWith("assets/")) {
      out.add(posix);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectAssetRefs(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (ASSET_KEYS.has(key) && typeof child === "string") {
        const posix = toPosix(child);
        if (posix.startsWith("assets/") || !posix.includes("://")) {
          if (posix.startsWith("assets/")) out.add(posix);
        }
      }
      collectAssetRefs(child, out);
    }
  }
}

function collectScriptModules(scene: Scene, out: Set<string>): void {
  for (const entity of scene.entities) {
    const behaviour = entity.components["script.behaviour"];
    if (
      behaviour &&
      typeof behaviour === "object" &&
      "module" in behaviour &&
      typeof (behaviour as { module: unknown }).module === "string"
    ) {
      out.add(toPosix((behaviour as { module: string }).module));
    }
  }
}

function collectPrefabScriptModules(prefab: Prefab, out: Set<string>): void {
  const walk = (node: Prefab["root"]): void => {
    const behaviour = node.components["script.behaviour"];
    if (
      behaviour &&
      typeof behaviour === "object" &&
      "module" in behaviour &&
      typeof (behaviour as { module: unknown }).module === "string"
    ) {
      out.add(toPosix((behaviour as { module: string }).module));
    }
    for (const child of node.children) walk(child);
  };
  walk(prefab.root);
}

/**
 * Load an ArcForge project folder into a validated in-memory bundle.
 */
export async function loadProjectBundle(
  projectRoot: string
): Promise<{ bundle: ProjectBundle; issues: ExportIssue[] }> {
  const issues: ExportIssue[] = [];
  const root = path.resolve(projectRoot);
  const manifestPath = path.join(root, "project.arcforge.json");

  if (!(await pathExists(manifestPath))) {
    issues.push(
      issue(
        "error",
        "missing-manifest",
        "project.arcforge.json not found",
        "project.arcforge.json"
      )
    );
    throw new ExportLoadError(issues);
  }

  let manifest;
  try {
    manifest = parseProjectManifest(await readJsonFile(manifestPath));
  } catch (err) {
    issues.push(
      issue(
        "error",
        "invalid-manifest",
        err instanceof Error ? err.message : "Invalid project manifest",
        "project.arcforge.json"
      )
    );
    throw new ExportLoadError(issues);
  }

  const sceneFiles = await listFiles(root, (rel) =>
    rel.startsWith("scenes/") && rel.endsWith(".scene.json")
  );
  const prefabFiles = await listFiles(root, (rel) =>
    rel.startsWith("prefabs/") && rel.endsWith(".prefab.json")
  );

  const scenes: CollectedScene[] = [];
  const prefabs: CollectedPrefab[] = [];
  const scriptPaths = new Set<string>();
  const assetPaths = new Set<string>();

  for (const rel of sceneFiles) {
    const abs = path.join(root, ...rel.split("/"));
    try {
      const scene = parseScene(await readJsonFile(abs));
      scenes.push({ path: rel, scene });
      collectScriptModules(scene, scriptPaths);
      collectAssetRefs(scene, assetPaths);
    } catch (err) {
      issues.push(
        issue(
          "error",
          "invalid-scene",
          err instanceof Error ? err.message : "Invalid scene",
          rel
        )
      );
    }
  }

  for (const rel of prefabFiles) {
    const abs = path.join(root, ...rel.split("/"));
    try {
      const prefab = parsePrefab(await readJsonFile(abs));
      prefabs.push({ path: rel, prefab });
      collectPrefabScriptModules(prefab, scriptPaths);
      collectAssetRefs(prefab, assetPaths);
    } catch (err) {
      issues.push(
        issue(
          "error",
          "invalid-prefab",
          err instanceof Error ? err.message : "Invalid prefab",
          rel
        )
      );
    }
  }

  if (scenes.length === 0) {
    issues.push(
      issue("error", "no-scenes", "No scenes found under scenes/")
    );
  }

  const defaultScene = toPosix(manifest.defaultScene);
  if (!scenes.some((s) => s.path === defaultScene)) {
    issues.push(
      issue(
        "error",
        "missing-default-scene",
        `Default scene not found: ${defaultScene}`,
        defaultScene
      )
    );
  }

  const scripts: CollectedScript[] = [];
  for (const rel of [...scriptPaths].sort()) {
    const abs = resolveUnderRoot(root, rel);
    if (!abs) {
      issues.push(
        issue("error", "unsafe-script-path", `Unsafe script path: ${rel}`, rel)
      );
      continue;
    }
    if (!(await pathExists(abs))) {
      issues.push(
        issue("error", "missing-script", `Script not found: ${rel}`, rel)
      );
      continue;
    }
    const source = await fs.readFile(abs, "utf8");
    scripts.push({ path: rel, absolutePath: abs, source });
  }

  // Also collect any scripts on disk that weren't referenced (warn only).
  const allScriptFiles = await listFiles(
    root,
    (rel) => rel.startsWith("scripts/") && rel.endsWith(".ts")
  );
  for (const rel of allScriptFiles) {
    if (scriptPaths.has(rel)) continue;
    issues.push(
      issue(
        "warning",
        "unreferenced-script",
        `Script exists but is not referenced by any scene/prefab: ${rel}`,
        rel
      )
    );
  }

  const referencedAssets: string[] = [];
  for (const rel of [...assetPaths].sort()) {
    const abs = resolveUnderRoot(root, rel);
    if (!abs) {
      issues.push(
        issue("error", "unsafe-asset-path", `Unsafe asset path: ${rel}`, rel)
      );
      continue;
    }
    if (!(await pathExists(abs))) {
      issues.push(
        issue("error", "missing-asset", `Referenced asset not found: ${rel}`, rel)
      );
      continue;
    }
    referencedAssets.push(rel);
  }

  const bundle: ProjectBundle = {
    root,
    manifest,
    manifestPath,
    scenes,
    prefabs,
    scripts,
    referencedAssets,
  };

  return { bundle, issues };
}

export class ExportLoadError extends Error {
  readonly issues: ExportIssue[];

  constructor(issues: ExportIssue[]) {
    super(issues.map((i) => i.message).join("; "));
    this.name = "ExportLoadError";
    this.issues = issues;
  }
}
