import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import { errorResult, jsonResult } from "../toolResult.js";

export function registerSceneTools(server: McpServer, ctx: ProjectContext): void {
  server.registerTool(
    "scene.list",
    {
      title: "List scenes",
      description: "Lists scene files in the project with basic metadata.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        return jsonResult({ scenes: await ctx.listScenes() });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.registerTool(
    "scene.open",
    {
      title: "Open scene summary",
      description: "Returns a scene summary (entities + component ids) without mutating files.",
      inputSchema: {
        scene: z.string().describe('Scene path, e.g. "scenes/Main.scene.json"'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ scene }) => {
      try {
        return jsonResult(await ctx.openScene(scene));
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.registerTool(
    "scene.get_entity",
    {
      title: "Get entity",
      description: "Returns one entity (and components) from a scene.",
      inputSchema: {
        scene: z.string().describe("Scene path"),
        entityId: z.string().describe("Entity id"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ scene, entityId }) => {
      try {
        const data = await ctx.readScene(scene);
        const entity = data.entities.find((e) => e.id === entityId);
        if (!entity) {
          return errorResult(`Entity not found: ${entityId}`);
        }
        return jsonResult({
          scene,
          entity,
        });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
