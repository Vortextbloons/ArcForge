import { z } from "zod";
import {
  findDocByUri,
  getRelevantDocs,
  searchDocs,
} from "@arcforge/docs-indexer";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import { TOOL_POLICY_MAP, type PolicyTool } from "../auth/policyTypes.js";
import { errorResult, jsonResult } from "../toolResult.js";

function allowedToolsForContext(ctx: ProjectContext): string[] {
  const names = Object.keys(TOOL_POLICY_MAP);
  return names.filter((tool) => {
    const capability = TOOL_POLICY_MAP[tool] as PolicyTool | undefined;
    if (!capability) return false;
    const mode = ctx.policy.mcp.allowedTools[capability] ?? ctx.policy.mcp.defaultMode;
    if (mode === "deny") return false;
    if (ctx.readonly) {
      return [
        "project.read",
        "docs.read",
        "docs.search",
        "scene.read",
        "prefab.read",
        "script.read",
        "build.preview",
      ].includes(capability);
    }
    return true;
  });
}

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
        "Reads one documentation resource by arcforge:// URI from docs.search.",
      inputSchema: {
        uri: z
          .string()
          .describe('Doc URI, e.g. "arcforge://docs/scripting/behaviour"'),
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
    "docs.get_relevant",
    {
      title: "Get relevant docs",
      description:
        "Returns docs, components, scripts, conventions, allowed tools, and warnings for a task. Call before non-trivial edits.",
      inputSchema: {
        task: z
          .string()
          .describe(
            'Task description, e.g. "Add a third-person player with coin pickup."'
          ),
        limit: z.number().int().min(1).max(25).default(10),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ task, limit }) => {
      const [scriptPaths, components] = await Promise.all([
        ctx.listScriptPaths(),
        Promise.resolve(ctx.listComponents()),
      ]);
      const relevant = getRelevantDocs(ctx.docs, task, {
        limit,
        scriptPaths,
        componentIds: components.map((c) => c.id),
        allowedTools: allowedToolsForContext(ctx),
      });
      return jsonResult(relevant);
    }
  );

  server.registerTool(
    "docs.refresh_index",
    {
      title: "Refresh docs index",
      description:
        "Rebuilds the documentation index from disk and schemas. Writes .arcforge/docs.index.json and .generated/docs.",
      inputSchema: {
        includeProjectDocs: z.boolean().default(true),
        includeGeneratedSchemas: z.boolean().default(true),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ includeProjectDocs, includeGeneratedSchemas }) => {
      const docs = await ctx.refreshDocs({
        includeProjectDocs,
        includeGeneratedSchemas,
      });
      return jsonResult({
        ok: true,
        generatedAt: docs.generatedAt,
        sourceCount: docs.sources.length,
        includeProjectDocs,
        includeGeneratedSchemas,
      });
    }
  );
}
