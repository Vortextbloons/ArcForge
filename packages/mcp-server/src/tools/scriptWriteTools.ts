import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import { jsonResult, recordWriteSuccess, withPermission } from "../toolGate.js";

export function registerScriptWriteTools(server: McpServer, ctx: ProjectContext): void {
  server.registerTool(
    "script.read",
    {
      title: "Read script",
      description: "Reads a project script under scripts/.",
      inputSchema: {
        path: z.string().describe('Script path, e.g. "scripts/player.controller.ts"'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ path: scriptPath }) =>
      withPermission(ctx, "script.read", async () =>
        jsonResult(await ctx.mutator.readScript(scriptPath))
      )
  );

  server.registerTool(
    "script.create",
    {
      title: "Create script",
      description: "Creates a Behaviour script under scripts/ after lightweight typecheck.",
      inputSchema: {
        path: z.string().describe('Script path under scripts/, e.g. "scripts/enemy.ai.ts"'),
        purpose: z.string().optional(),
        content: z
          .string()
          .optional()
          .describe("Full TypeScript source; generated stub if omitted"),
      },
      annotations: { readOnlyHint: false },
    },
    async (args) =>
      withPermission(ctx, "script.create", async () => {
        const result = await ctx.mutator.createScript(args);
        await recordWriteSuccess(
          ctx,
          "script.create",
          `Created script ${result.data.path}`,
          result.paths,
          { after: result.after }
        );
        return jsonResult(result);
      })
  );

  server.registerTool(
    "script.edit",
    {
      title: "Edit script",
      description:
        "Overwrites a Behaviour script after lightweight typecheck. Prefer docs.search first.",
      inputSchema: {
        path: z.string(),
        content: z.string().min(1),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
      },
    },
    async (args) =>
      withPermission(ctx, "script.edit", async () => {
        const result = await ctx.mutator.editScript(args);
        await recordWriteSuccess(
          ctx,
          "script.edit",
          `Edited script ${result.data.path}`,
          result.paths,
          { before: result.before, after: result.after }
        );
        return jsonResult(result);
      })
  );
}
