import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import { jsonResult, recordWriteSuccess, withPermission } from "../toolGate.js";

export function registerDiffTools(server: McpServer, ctx: ProjectContext): void {
  server.registerTool(
    "diff.list",
    {
      title: "List AI diffs",
      description: "Lists recent MCP write operations recorded for review (AI diff review).",
      inputSchema: {
        limit: z.number().int().min(1).max(100).default(20),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ limit }) =>
      withPermission(ctx, "diff.list", async () =>
        jsonResult({ entries: await ctx.diffs.list(limit) })
      )
  );

  server.registerTool(
    "diff.summarize",
    {
      title: "Summarize AI diffs",
      description: "Summarizes recent AI writes: tools, paths, validation flags.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).default(20),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ limit }) =>
      withPermission(ctx, "diff.summarize", async () =>
        jsonResult(await ctx.diffs.summarize(limit))
      )
  );
}

export function registerPreviewTool(server: McpServer, ctx: ProjectContext): void {
  server.registerTool(
    "build.preview",
    {
      title: "Preview build",
      description:
        "Starts or refreshes preview. Headless mode writes a preview marker; attached Tauri will drive the live viewport later.",
      inputSchema: {
        scene: z.string().optional().describe("Scene to preview; defaults to project defaultScene"),
      },
      annotations: { readOnlyHint: false },
    },
    async ({ scene }) =>
      withPermission(ctx, "build.preview", async () => {
        const target = scene ?? ctx.manifest.defaultScene;
        // Ensure scene exists / is valid before previewing.
        await ctx.readScene(target);
        const state = await ctx.preview.start(target);
        await recordWriteSuccess(
          ctx,
          "build.preview",
          `Preview requested for ${target}`,
          [`.threeforge/preview/state.json`],
          { after: state }
        );
        return jsonResult({ ok: true, preview: state });
      })
  );
}
