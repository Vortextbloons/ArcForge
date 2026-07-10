import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import { jsonResult, recordWriteSuccess, withPermission } from "../toolGate.js";

export function registerSceneWriteTools(server: McpServer, ctx: ProjectContext): void {
  server.registerTool(
    "scene.create",
    {
      title: "Create scene",
      description: "Creates a validated empty scene under scenes/.",
      inputSchema: { path: z.string(), name: z.string().min(1) },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) =>
      withPermission(ctx, "scene.create", async () => {
        const result = await ctx.mutator.createScene(args);
        await recordWriteSuccess(ctx, "scene.create", `Created ${result.data.path}`, result.paths, {
          after: result.after,
        });
        return jsonResult(result);
      })
  );

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
      description: "Deletes an entity (and descendants) through DeleteEntityCommand.",
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

  server.registerTool(
    "scene.rename_entity",
    {
      title: "Rename entity",
      description: "Renames an entity through RenameEntityCommand.",
      inputSchema: { scene: z.string(), entityId: z.string(), name: z.string().min(1) },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) =>
      withPermission(ctx, "scene.rename_entity", async () => {
        const result = await ctx.mutator.renameEntity(args);
        await recordWriteSuccess(
          ctx,
          "scene.rename_entity",
          `Renamed ${args.entityId}`,
          result.paths,
          {
            before: result.before,
            after: result.after,
          }
        );
        return jsonResult(result);
      })
  );

  server.registerTool(
    "scene.reparent_entity",
    {
      title: "Reparent entity",
      description: "Changes an entity parent while preventing hierarchy cycles.",
      inputSchema: { scene: z.string(), entityId: z.string(), parent: z.string().nullable() },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) =>
      withPermission(ctx, "scene.reparent_entity", async () => {
        const result = await ctx.mutator.reparentEntity(args);
        await recordWriteSuccess(
          ctx,
          "scene.reparent_entity",
          `Reparented ${args.entityId}`,
          result.paths,
          { before: result.before, after: result.after }
        );
        return jsonResult(result);
      })
  );

  server.registerTool(
    "scene.duplicate_entity",
    {
      title: "Duplicate entity",
      description: "Duplicates an entity and all descendants with remapped ids.",
      inputSchema: { scene: z.string(), entityId: z.string(), id: z.string().optional() },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) =>
      withPermission(ctx, "scene.duplicate_entity", async () => {
        const result = await ctx.mutator.duplicateEntity(args);
        await recordWriteSuccess(
          ctx,
          "scene.duplicate_entity",
          `Duplicated ${args.entityId}`,
          result.paths,
          { before: result.before, after: result.after }
        );
        return jsonResult(result);
      })
  );

  server.registerTool(
    "scene.remove_component",
    {
      title: "Remove component",
      description: "Removes a component through RemoveComponentCommand.",
      inputSchema: { scene: z.string(), entityId: z.string(), component: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async (args) =>
      withPermission(ctx, "scene.remove_component", async () => {
        const result = await ctx.mutator.removeComponent(args);
        await recordWriteSuccess(
          ctx,
          "scene.remove_component",
          `Removed ${args.component} from ${args.entityId}`,
          result.paths,
          { before: result.before, after: result.after }
        );
        return jsonResult(result);
      })
  );

  server.registerTool(
    "scene.instantiate_prefab",
    {
      title: "Instantiate prefab",
      description: "Adds a portable prefab instance with optional sparse overrides.",
      inputSchema: {
        scene: z.string(),
        prefab: z.string(),
        name: z.string().optional(),
        parent: z.string().nullable().optional(),
        id: z.string().optional(),
        overrides: z.record(z.unknown()).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) =>
      withPermission(ctx, "scene.instantiate_prefab", async () => {
        const result = await ctx.mutator.instantiatePrefab(args);
        await recordWriteSuccess(
          ctx,
          "scene.instantiate_prefab",
          `Instantiated ${args.prefab}`,
          result.paths,
          { before: result.before, after: result.after }
        );
        return jsonResult(result);
      })
  );
}
