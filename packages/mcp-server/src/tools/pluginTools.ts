import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import { withPermission, recordWriteSuccess } from "../toolGate.js";
import { errorResult, jsonResult } from "../toolResult.js";
import {
  createPlugin,
  listPlugins,
  readPlugin,
  setPluginEnabled,
  validatePlugin,
} from "../mutations/pluginMutations.js";

export function registerPluginTools(
  server: McpServer,
  ctx: ProjectContext
): void {
  server.registerTool(
    "plugin.list",
    {
      title: "List plugins",
      description: "Lists plugins under plugins/*/plugin.arcforge.json.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () =>
      withPermission(ctx, "plugin.list", async () => {
        const plugins = await listPlugins(ctx.projectRoot);
        return jsonResult({
          plugins: plugins.map((p) => ({
            id: p.manifest.id,
            name: p.manifest.name,
            version: p.manifest.version,
            enabled: p.manifest.enabled,
            folder: p.folder,
            components: p.manifest.components,
          })),
        });
      })
  );

  server.registerTool(
    "plugin.read",
    {
      title: "Read plugin",
      description: "Reads one plugin manifest and component defs.",
      inputSchema: {
        plugin: z.string().describe("Plugin id or folder name"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ plugin }) =>
      withPermission(ctx, "plugin.read", async () => {
        try {
          const p = await readPlugin(ctx.projectRoot, plugin);
          return jsonResult({
            folder: p.folder,
            manifest: p.manifest,
            components: p.components,
          });
        } catch (err) {
          return errorResult(err instanceof Error ? err.message : String(err));
        }
      })
  );

  server.registerTool(
    "plugin.validate",
    {
      title: "Validate plugin",
      description: "Validates a plugin manifest and referenced files.",
      inputSchema: {
        plugin: z.string(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ plugin }) =>
      withPermission(ctx, "plugin.validate", async () => {
        const result = await validatePlugin(ctx.projectRoot, plugin);
        return jsonResult(result);
      })
  );

  server.registerTool(
    "plugin.create",
    {
      title: "Create plugin",
      description:
        "Scaffolds a plugin under plugins/ (manifest, component JSON, docs). Requires plugin.create permission.",
      inputSchema: {
        id: z.string().describe('Plugin id, e.g. "game.inventory"'),
        name: z.string(),
        folder: z.string().optional(),
        description: z.string().optional(),
        componentId: z.string().optional(),
      },
    },
    async (args) =>
      withPermission(ctx, "plugin.create", async () => {
        try {
          const result = await createPlugin(ctx.projectRoot, args);
          await recordWriteSuccess(ctx, "plugin.create", `Created plugin ${args.id}`, result.paths);
          return jsonResult(result.data);
        } catch (err) {
          return errorResult(err instanceof Error ? err.message : String(err));
        }
      })
  );

  server.registerTool(
    "plugin.enable",
    {
      title: "Enable plugin",
      description: "Sets plugin.manifest.enabled = true.",
      inputSchema: { plugin: z.string() },
    },
    async ({ plugin }) =>
      withPermission(ctx, "plugin.enable", async () => {
        try {
          const result = await setPluginEnabled(ctx.projectRoot, plugin, true);
          await recordWriteSuccess(ctx, "plugin.enable", `Enabled ${plugin}`, result.paths);
          return jsonResult(result.data);
        } catch (err) {
          return errorResult(err instanceof Error ? err.message : String(err));
        }
      })
  );

  server.registerTool(
    "plugin.disable",
    {
      title: "Disable plugin",
      description: "Sets plugin.manifest.enabled = false.",
      inputSchema: { plugin: z.string() },
    },
    async ({ plugin }) =>
      withPermission(ctx, "plugin.disable", async () => {
        try {
          const result = await setPluginEnabled(ctx.projectRoot, plugin, false);
          await recordWriteSuccess(ctx, "plugin.disable", `Disabled ${plugin}`, result.paths);
          return jsonResult(result.data);
        } catch (err) {
          return errorResult(err instanceof Error ? err.message : String(err));
        }
      })
  );
}
