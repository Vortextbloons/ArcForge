import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import { errorResult, jsonResult } from "../toolResult.js";

export function registerBuildTools(server: McpServer, ctx: ProjectContext): void {
  server.registerTool(
    "build.get_errors",
    {
      title: "Get build / validation errors",
      description:
        "Validates scenes and typechecks referenced scripts; returns errors and warnings.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        return jsonResult(await ctx.getErrors());
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
