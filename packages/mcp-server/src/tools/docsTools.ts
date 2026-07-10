import { z } from "zod";
import { findDocByUri, searchDocs } from "@threeforge/docs-indexer";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import { errorResult, jsonResult } from "../toolResult.js";

export function registerDocsTools(
  server: McpServer,
  ctx: ProjectContext
): void {
  server.registerTool(
    "docs.search",
    {
      title: "Search docs",
      description:
        "Searches indexed engine/project/component docs. Call this before proposing edits.",
      inputSchema: {
        query: z.string().describe("Search query"),
        scope: z
          .enum([
            "all",
            "engine",
            "project",
            "scripting",
            "components",
            "mcp",
            "plugins",
            "exporting",
          ])
          .default("all")
          .describe("Optional docs scope filter"),
        limit: z.number().int().min(1).max(25).default(8),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, scope, limit }) => {
      const results = searchDocs(ctx.docs, query, { scope, limit });
      return jsonResult({ query, scope, results });
    }
  );

  server.registerTool(
    "docs.read",
    {
      title: "Read docs",
      description:
        "Reads one documentation resource by threeforge:// URI from docs.search.",
      inputSchema: {
        uri: z
          .string()
          .describe('Doc URI, e.g. "threeforge://docs/scripting/behaviour"'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ uri }) => {
      const doc = findDocByUri(ctx.docs, uri);
      if (!doc) {
        return errorResult(
          `Doc not found: ${uri}. Use docs.search or docs.list_sources.`
        );
      }
      return jsonResult({
        uri: doc.uri,
        title: doc.title,
        scope: doc.scope,
        kind: doc.kind,
        body: doc.body,
      });
    }
  );

  server.registerTool(
    "docs.list_sources",
    {
      title: "List doc sources",
      description: "Lists available documentation sources in the current index.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () =>
      jsonResult({
        generatedAt: ctx.docs.generatedAt,
        sources: ctx.docs.sources.map((s) => ({
          uri: s.uri,
          title: s.title,
          scope: s.scope,
          kind: s.kind,
          tags: s.tags,
        })),
      })
  );

  server.registerTool(
    "docs.refresh_index",
    {
      title: "Refresh docs index",
      description: "Rebuilds the documentation index from disk and schemas.",
      inputSchema: {
        includeProjectDocs: z.boolean().default(true),
        includeGeneratedSchemas: z.boolean().default(true),
      },
      annotations: { readOnlyHint: true },
    },
    async () => {
      const docs = await ctx.refreshDocs();
      return jsonResult({
        ok: true,
        generatedAt: docs.generatedAt,
        sourceCount: docs.sources.length,
      });
    }
  );
}
