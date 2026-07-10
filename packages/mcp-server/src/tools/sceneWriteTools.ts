import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import {
  jsonResult,
  recordWriteSuccess,
  withPermission,
} from "../toolGate.js";

export function registerSceneWriteTools(
  server: McpServer,
  ctx: ProjectContext
): void {
  server.registerTool(
    "scene.create_entity",
    {
      title: "Create entity",
      description:
        "Creates an entity through editor-core CreateEntityCommand and saves the scene JSON.",
      inputSchema: {
        scene: z.string().describe('Scene path, e.g. "scenes/Main.scene.json"'),
        name: z.string().min(1),
        parent: z.string().nullable().optional(),
        id: z.string().optional(),
        components: z.record(z.unknown()).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async (args) =>
      withPermission(ctx, "scene.create_entity", async () => {
        const result = await ctx.mutator.createEntity(args);
        await recordWriteSuccess(
          ctx,
          "scene.create_entity",
          `Created entity ${result.data.entityId} in ${result.data.scene}`,
          result.paths,
          { before: result.before, after: result.after }
        );
        return jsonResult(result);
      })
  );

  server.registerTool(
    "scene.update_component",
    {
      title: "Update component",
      description:
        "Patches (or replaces) component data via UpdateComponentCommand / AddComponentCommand.",
      inputSchema: {
        scene: z.string(),
        entityId: z.string(),
        component: z.string().describe('Component id, e.g. "core.transform"'),
        patch: z.record(z.unknown()),
        replace: z
          .boolean()
          .optional()
          .describe("If true, replace component data instead of deep-merge"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
      },
    },
    async (args) =>
      withPermission(ctx, "scene.update_component", async () => {
        const result = await ctx.mutator.updateComponent(args);
        await recordWriteSuccess(
          ctx,
          "scene.update_component",
          `Updated ${args.component} on ${args.entityId}`,
          result.paths,
          { before: result.before, after: result.after }
        );
        return jsonResult(result);
      })
  );

  server.registerTool(
    "scene.delete_entity",
    {
      title: "Delete entity",
      description:
        "Deletes an entity (and descendants) through DeleteEntityCommand.",
      inputSchema: {
        scene: z.string(),
        entityId: z.string(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
      },
    },
    async (args) =>
      withPermission(ctx, "scene.delete_entity", async () => {
        const result = await ctx.mutator.deleteEntity(args);
        await recordWriteSuccess(
          ctx,
          "scene.delete_entity",
          `Deleted entity ${args.entityId}`,
          result.paths,
          { before: result.before, after: result.after }
        );
        return jsonResult(result);
      })
  );
}
