import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { findDocByUri } from "@arcforge/docs-indexer";
import type { ProjectContext } from "./projectContext.js";
import { registerAllTools } from "./tools/registerReadOnlyTools.js";

/**
 * Build an MCP server instance bound to a project.
 * Phase 5 read-only + Phase 6 write tools (when not --readonly).
 */
export function createMcpServer(ctx: ProjectContext): McpServer {
  const mode = ctx.readonly ? "read-only" : "read-write";
  const server = new McpServer(
    {
      name: "arcforge",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions: [
        `ArcForge MCP (${mode}).`,
        "Use docs.search / docs.read and component.list before proposing edits.",
        "Write tools go through editor-core commands, project policy, audit, and diff log.",
        ctx.readonly
          ? "Server is --readonly; pass --write to enable mutations."
          : "Write tools require policy allow (or --write to auto-approve ask).",
        `Project: ${ctx.manifest.name} at ${ctx.projectRoot}`,
      ].join(" "),
    }
  );

  registerAllTools(server, ctx);

  for (const source of ctx.docs.sources) {
    const resourceName = source.uri
      .replace(/^arcforge:\/\//, "")
      .replace(/\//g, ".");
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
