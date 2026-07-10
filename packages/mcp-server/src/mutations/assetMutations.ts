import { promises as fs } from "node:fs";
import path from "node:path";
import { typecheckScripts } from "@arcforge/engine";
import { parsePrefab, type Prefab } from "@arcforge/schemas";
import type { MutationResult } from "./types.js";
import { absUnderRoot, normalizeProjectRel, pathExists, validateComponents } from "./pathSafety.js";

export async function createPrefabFile(
  projectRoot: string,
  input: {
    path?: string;
    name: string;
    root?: Prefab["root"];
  }
): Promise<MutationResult<{ path: string }>> {
  const slug =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "prefab";
  const rel = normalizeProjectRel(input.path ?? `prefabs/${slug}.prefab.json`, "prefabs/");
  if (!rel.endsWith(".prefab.json")) {
    throw new Error("Prefab path must end with .prefab.json");
  }
  const abs = absUnderRoot(projectRoot, rel);
  if (await pathExists(abs)) {
    throw new Error(`Prefab already exists: ${rel}`);
  }

  const prefab = parsePrefab({
    version: 1,
    name: input.name,
    root: input.root ?? {
      id: "root",
      name: input.name,
      components: {
        "core.transform": {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        "render.mesh": {
          primitive: "box",
          color: "#cccccc",
          castShadow: true,
          receiveShadow: true,
        },
      },
      children: [],
    },
  });

  validateComponents(prefab.root.components);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, `${JSON.stringify(prefab, null, 2)}\n`, "utf8");

  return {
    ok: true,
    data: { path: rel },
    paths: [rel],
    after: prefab,
  };
}

export async function listPrefabFiles(projectRoot: string): Promise<string[]> {
  const root = path.join(projectRoot, "prefabs");
  if (!(await pathExists(root))) return [];
  const names = await fs.readdir(root);
  return names
    .filter((n) => n.endsWith(".prefab.json"))
    .map((n) => `prefabs/${n}`)
    .sort();
}

export async function readPrefabFile(
  projectRoot: string,
  prefabPath: string
): Promise<{ path: string; prefab: Prefab }> {
  const rel = normalizeProjectRel(prefabPath, "prefabs/");
  const abs = absUnderRoot(projectRoot, rel);
  if (!(await pathExists(abs))) {
    throw new Error(`Prefab not found: ${rel}`);
  }
  const prefab = parsePrefab(JSON.parse(await fs.readFile(abs, "utf8")) as unknown);
  return { path: rel, prefab };
}

export async function createScriptFile(
  projectRoot: string,
  input: { path: string; purpose?: string; content?: string }
): Promise<MutationResult<{ path: string }>> {
  const rel = normalizeProjectRel(input.path, "scripts/");
  if (!rel.endsWith(".ts")) {
    throw new Error("Script path must end with .ts");
  }
  const abs = absUnderRoot(projectRoot, rel);
  if (await pathExists(abs)) {
    throw new Error(`Script already exists: ${rel}`);
  }

  const className = classNameFromPath(rel);
  const content = input.content ?? defaultScriptSource(className, input.purpose ?? className);

  const typecheck = typecheckScripts([{ path: rel, source: content }]);
  if (!typecheck.ok) {
    throw new Error(
      `Script failed typecheck: ${typecheck.diagnostics.map((d) => d.message).join("; ")}`
    );
  }

  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf8");

  return {
    ok: true,
    data: { path: rel },
    paths: [rel],
    after: content,
  };
}

export async function editScriptFile(
  projectRoot: string,
  input: { path: string; content: string }
): Promise<MutationResult<{ path: string }>> {
  const rel = normalizeProjectRel(input.path, "scripts/");
  if (!rel.endsWith(".ts")) {
    throw new Error("Script path must end with .ts");
  }
  const abs = absUnderRoot(projectRoot, rel);
  const before = (await pathExists(abs)) ? await fs.readFile(abs, "utf8") : undefined;

  const typecheck = typecheckScripts([{ path: rel, source: input.content }]);
  if (!typecheck.ok) {
    throw new Error(
      `Script failed typecheck: ${typecheck.diagnostics.map((d) => d.message).join("; ")}`
    );
  }

  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, input.content, "utf8");

  return {
    ok: true,
    data: { path: rel },
    paths: [rel],
    before,
    after: input.content,
  };
}

export async function readScriptFile(
  projectRoot: string,
  scriptPath: string
): Promise<{ path: string; content: string }> {
  const rel = normalizeProjectRel(scriptPath, "scripts/");
  const abs = absUnderRoot(projectRoot, rel);
  if (!(await pathExists(abs))) {
    throw new Error(`Script not found: ${rel}`);
  }
  return { path: rel, content: await fs.readFile(abs, "utf8") };
}

function classNameFromPath(rel: string): string {
  const base = path.basename(rel, ".ts");
  const parts = base.split(/[._-]+/).filter(Boolean);
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("") || "NewBehaviour";
}

function defaultScriptSource(className: string, purpose: string): string {
  return `import { Behaviour, type GameContext } from "@arcforge/engine";

/**
 * ${purpose}
 */
export default class ${className} extends Behaviour {
  onStart(ctx: GameContext): void {
    ctx.debug.info("${className} started", {
      entityId: ctx.entity.id,
      module: "scripts/${className}",
    });
  }

  update(_ctx: GameContext): void {}
}
`;
}
