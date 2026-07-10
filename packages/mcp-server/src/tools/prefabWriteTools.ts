import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import {
  jsonResult,
  recordWriteSuccess,
  withPermission,
} from "../toolGate.js";

export function registerPrefabWriteTools(
  server: McpServer,
  ctx: ProjectContext
): void {
  server.registerTool(
    "prefab.list",
    {
      title: "List prefabs",
      description: "Lists prefab files under prefabs/.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () =>
      withPermission(ctx, "prefab.list", async () =>
        jsonResult({ prefabs: await ctx.mutator.listPrefabs() })
      )
  );

  server.registerTool(
    "prefab.read",
    {
      title: "Read prefab",
      description: "Reads one prefab JSON file.",
      inputSchema: {
        path: z.string().describe('Prefab path, e.g. "prefabs/Coin.prefab.json"'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ path: prefabPath }) =>
      withPermission(ctx, "prefab.read", async () =>
        jsonResult(await ctx.mutator.readPrefab(prefabPath))
      )
  );

  server.registerTool(
    "prefab.create",
    {
      title: "Create prefab",
      description: "Creates a new prefab JSON under prefabs/ (validated).",
      inputSchema: {
        name: z.string().min(1),
        path: z.string().optional(),
        root: z
          .object({
            id: z.string(),
            name: z.string(),
            components: z.record(z.unknown()),
            children: z.array(z.unknown()).default([]),
          })
          .optional(),
      },
      annotations: { readOnlyHint: false },
    },
    async (args) =>
      withPermission(ctx, "prefab.create", async () => {
        const result = await ctx.mutator.createPrefab({
          name: args.name,
          path: args.path,
          root: args.root as
            | {
                id: string;
                name: string;
                components: Record<string, unknown>;
                children: [];
              }
            | undefined,
        });
        await recordWriteSuccess(
          ctx,
          "prefab.create",
          `Created prefab ${result.data.path}`,
          result.paths,
          { after: result.after }
        );
        return jsonResult(result);
      })
  );
}
