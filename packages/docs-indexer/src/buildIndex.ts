import path from "node:path";
import { indexMarkdown } from "./indexMarkdown.js";
import { indexComponentSchemas } from "./indexSchemas.js";
import { writeDocsIndexFile, writeGeneratedDocs } from "./persistIndex.js";
import type { BuildDocIndexOptions, DocIndex, DocSource } from "./types.js";

const MCP_TOOLS_BODY = `# MCP Tools (Phase 5–8)

## Documentation (required before non-trivial edits)

- \`docs.get_relevant\` — task-scoped docs, components, scripts, conventions, warnings
- \`docs.search\` / \`docs.read\` / \`docs.list_sources\` / \`docs.refresh_index\`

## Read tools

- \`project.get_info\` — project metadata
- \`scene.list\` / \`scene.open\` / \`scene.get_entity\` — inspect scenes
- \`component.list\` / \`component.get_schema\` — component schemas
- \`plugin.list\` / \`plugin.read\` / \`plugin.validate\`
- \`asset.list\` / \`asset.inspect\` / \`asset.get_import_settings\`
- \`auth.list_clients\` — local pairing registry
- \`build.get_errors\` — validation / script / performance warnings

## Write tools (require \`--write\` / policy allow)

- \`scene.create_entity\` / \`scene.update_component\` / \`scene.delete_entity\`
- \`prefab.list\` / \`prefab.read\` / \`prefab.create\`
- \`script.read\` / \`script.create\` / \`script.edit\`
- \`plugin.create\` / \`plugin.enable\` / \`plugin.disable\`
- \`asset.import\` / \`asset.update_import_settings\`
- \`auth.pair_client\` / \`auth.revoke_client\`
- \`build.preview\`
- \`diff.list\` / \`diff.summarize\`

## AI workflow

1. \`docs.get_relevant\` with the task description
2. \`project.get_info\` + \`component.list\` + \`scene.open\` as needed
3. Apply mutations through MCP tools (not engine internals)
4. \`build.get_errors\` / script typecheck after edits

Prefer docs tools before suggesting edits. Mutations use editor-core commands.
`;

/**
 * Build a documentation index from engine docs, project docs, and schemas.
 */
export async function buildDocIndex(options: BuildDocIndexOptions = {}): Promise<DocIndex> {
  const sources: DocSource[] = [];
  const includeProjectDocs = options.includeProjectDocs !== false;
  const includeSchemas = options.includeComponentSchemas !== false;

  if (options.engineDocsRoot) {
    sources.push(...(await indexMarkdown(options.engineDocsRoot)));
  }

  if (options.projectRoot && includeProjectDocs) {
    const projectDocs = path.join(options.projectRoot, "docs");
    sources.push(...(await indexMarkdown(projectDocs, { projectDocs: true })));
  }

  if (includeSchemas) {
    sources.push(...indexComponentSchemas());
  }

  sources.push({
    uri: "arcforge://docs/mcp/tools",
    title: "MCP Tools (Phase 5–8)",
    kind: "markdown",
    path: "",
    tags: ["mcp", "tools"],
    scope: "mcp",
    body: MCP_TOOLS_BODY,
  });

  // De-dupe by URI (last wins).
  const byUri = new Map<string, DocSource>();
  for (const source of sources) {
    byUri.set(source.uri, source);
  }

  const index: DocIndex = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: [...byUri.values()].sort((a, b) => a.uri.localeCompare(b.uri)),
  };

  if (options.projectRoot && options.persistIndex !== false) {
    await writeDocsIndexFile(options.projectRoot, index);
  }

  if (options.writeGenerated !== false) {
    await writeGeneratedDocs({
      projectRoot: options.projectRoot,
      engineDocsRoot: options.engineDocsRoot,
      mcpToolsBody: MCP_TOOLS_BODY,
      sources: index.sources,
    });
  }

  return index;
}
