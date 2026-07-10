import { z } from "zod";
import { CORE_COMPONENT_MAP, CORE_COMPONENTS } from "@threeforge/schemas";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import { errorResult, jsonResult } from "../toolResult.js";

export function registerComponentTools(
  server: McpServer,
  _ctx: ProjectContext
): void {
  server.registerTool(
    "component.list",
    {
      title: "List components",
      description:
        "Lists core component schemas available to scenes and the inspector.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () =>
      jsonResult({
        components: CORE_COMPONENTS.map((c) => ({
          id: c.id,
          displayName: c.displayName,
          summary: c.docs.summary,
          docsUri: `threeforge://docs/components/${c.id}`,
        })),
      })
  );

  server.registerTool(
    "component.get_schema",
    {
      title: "Get component schema",
      description:
        "Returns defaults, inspector metadata, and docs for one component id.",
      inputSchema: {
        id: z
          .string()
          .describe('Component id, e.g. "core.transform" or "render.mesh"'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      const component = CORE_COMPONENT_MAP[id];
      if (!component) {
        return errorResult(
          `Unknown component: ${id}. Call component.list for available ids.`
        );
      }
      return jsonResult({
        id: component.id,
        displayName: component.displayName,
        defaults: component.defaults,
        inspector: component.inspector,
        docs: component.docs,
        docsUri: `threeforge://docs/components/${component.id}`,
      });
    }
  );
}
