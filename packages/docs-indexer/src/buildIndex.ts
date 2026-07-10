import path from "node:path";
import { indexMarkdown } from "./indexMarkdown.js";
import { indexComponentSchemas } from "./indexSchemas.js";
import type { BuildDocIndexOptions, DocIndex, DocSource } from "./types.js";

/**
 * Build a documentation index from engine docs, project docs, and schemas.
 */
export async function buildDocIndex(
  options: BuildDocIndexOptions = {}
): Promise<DocIndex> {
  const sources: DocSource[] = [];

  if (options.engineDocsRoot) {
    sources.push(...(await indexMarkdown(options.engineDocsRoot)));
  }

  if (options.projectRoot) {
    const projectDocs = path.join(options.projectRoot, "docs");
    sources.push(
      ...(await indexMarkdown(projectDocs, { projectDocs: true }))
    );
  }

  if (options.includeComponentSchemas !== false) {
    sources.push(...indexComponentSchemas());
  }

  // Built-in MCP tool overview (always available).
  sources.push({
    uri: "arcforge://docs/mcp/tools",
    title: "MCP Tools (Phase 5 read-only)",
    kind: "markdown",
    path: "",
    tags: ["mcp", "tools"],
    scope: "mcp",
    body: `# MCP Tools (Phase 5–6)

Read tools:

- \`project.get_info\` — project metadata
- \`scene.list\` / \`scene.open\` — inspect scenes
- \`component.list\` — list component schemas
- \`docs.search\` / \`docs.read\` — documentation
- \`build.get_errors\` — validation / script diagnostics

Write tools (require \`--write\` / policy allow):

- \`scene.create_entity\` / \`scene.update_component\` / \`scene.delete_entity\`
- \`prefab.create\`
- \`script.create\` / \`script.edit\`
- \`build.preview\`
- \`diff.list\` / \`diff.summarize\`

Prefer docs tools before suggesting edits. Mutations use editor-core commands.
`,
  });

  // De-dupe by URI (last wins).
  const byUri = new Map<string, DocSource>();
  for (const source of sources) {
    byUri.set(source.uri, source);
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: [...byUri.values()].sort((a, b) => a.uri.localeCompare(b.uri)),
  };
}
