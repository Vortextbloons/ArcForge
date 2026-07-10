import { promises as fs } from "node:fs";
import path from "node:path";
import { CORE_COMPONENTS } from "@arcforge/schemas";
import type { DocIndex, DocSource } from "./types.js";

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/** Persist a lightweight docs index (no bodies) under .arcforge/docs.index.json. */
export async function writeDocsIndexFile(
  projectRoot: string,
  index: DocIndex
): Promise<string> {
  const dir = path.join(projectRoot, ".arcforge");
  await ensureDir(dir);
  const outPath = path.join(dir, "docs.index.json");
  const payload = {
    version: index.version,
    generatedAt: index.generatedAt,
    sources: index.sources.map((s) => ({
      uri: s.uri,
      title: s.title,
      kind: s.kind,
      path: s.path,
      tags: s.tags,
      scope: s.scope,
    })),
  };
  await fs.writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return outPath;
}

/**
 * Write generated component / script-api / mcp-tools JSON under .generated/docs/.
 * Prefer projectRoot when set; otherwise write beside engineDocsRoot's parent.
 */
export async function writeGeneratedDocs(options: {
  projectRoot?: string;
  engineDocsRoot?: string;
  mcpToolsBody?: string;
  sources?: DocSource[];
}): Promise<string | null> {
  const root = options.engineDocsRoot
    ? path.resolve(options.engineDocsRoot, "..")
    : (options.projectRoot ?? null);
  if (!root) return null;

  const outDir = path.join(root, ".generated", "docs");
  await ensureDir(outDir);

  const components = {
    generatedAt: new Date().toISOString(),
    components: CORE_COMPONENTS.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      summary: c.docs.summary,
      aiUsage: c.docs.aiUsage,
      defaults: c.defaults,
      inspector: c.inspector,
      docsUri: `arcforge://docs/components/${c.id}`,
    })),
  };
  await fs.writeFile(
    path.join(outDir, "components.json"),
    `${JSON.stringify(components, null, 2)}\n`,
    "utf8"
  );

  const scriptApi = {
    generatedAt: new Date().toISOString(),
    behaviour: {
      import: 'import { Behaviour, type GameContext } from "@arcforge/engine"',
      lifecycle: ["onStart", "update", "fixedUpdate", "onDestroy"],
      context: [
        "time",
        "entity",
        "world",
        "scene",
        "input",
        "events",
        "debug",
      ],
      docsUri: "arcforge://docs/scripting/behaviour",
    },
  };
  await fs.writeFile(
    path.join(outDir, "script-api.json"),
    `${JSON.stringify(scriptApi, null, 2)}\n`,
    "utf8"
  );

  const mcpSource = options.sources?.find(
    (s) => s.uri === "arcforge://docs/mcp/tools"
  );
  const mcpTools = {
    generatedAt: new Date().toISOString(),
    docsUri: "arcforge://docs/mcp/tools",
    body: options.mcpToolsBody ?? mcpSource?.body ?? "",
  };
  await fs.writeFile(
    path.join(outDir, "mcp-tools.json"),
    `${JSON.stringify(mcpTools, null, 2)}\n`,
    "utf8"
  );

  return outDir;
}
