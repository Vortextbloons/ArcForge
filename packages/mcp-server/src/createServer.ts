import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { findDocByUri } from "@threeforge/docs-indexer";
import type { ProjectContext } from "./projectContext.js";
import { registerReadOnlyTools } from "./tools/registerReadOnlyTools.js";

/**
 * Build an MCP server instance bound to a project (Phase 5: read-only tools).
 */
export function createMcpServer(ctx: ProjectContext): McpServer {
  const server = new McpServer(
    {
      name: "threeforge",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions: [
        "ThreeForge MCP (read-only Phase 5).",
        "Use docs.search / docs.read and component.list before suggesting edits.",
        "Write/mutation tools are not available yet (Phase 6).",
        `Project: ${ctx.manifest.name} at ${ctx.projectRoot}`,
      ].join(" "),
    }
  );

  registerReadOnlyTools(server, ctx);

  // Expose indexed docs as MCP resources.
  for (const source of ctx.docs.sources) {
    const resourceName = source.uri.replace(/^threeforge:\/\//, "").replace(/\//g, ".");
    server.registerResource(
      resourceName,
      source.uri,
      {
        title: source.title,
        description: `${source.scope} documentation`,
        mimeType: "text/markdown",
      },
      async (uri) => {
        const key = typeof uri === "string" ? uri : uri.href;
        const doc = findDocByUri(ctx.docs, key);
        if (!doc) {
          throw new Error(`Resource not found: ${key}`);
        }
        return {
          contents: [
            {
              uri: doc.uri,
              mimeType: "text/markdown",
              text: doc.body,
            },
          ],
        };
      }
    );
  }

  return server;
}
