import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import { errorResult, jsonResult } from "../toolResult.js";

export function registerProjectTools(
  server: McpServer,
  ctx: ProjectContext
): void {
  server.registerTool(
    "project.get_info",
    {
      title: "Get project info",
      description:
        "Returns ArcForge project metadata from project.threeforge.json.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () =>
      jsonResult({
        name: ctx.manifest.name,
        engineVersion: ctx.manifest.engineVersion,
        defaultScene: ctx.manifest.defaultScene,
        render: ctx.manifest.render,
        physics: ctx.manifest.physics,
        scripting: ctx.manifest.scripting,
        export: ctx.manifest.export,
        projectRoot: ctx.projectRoot,
        readonly: ctx.readonly,
        attached: ctx.attached,
      })
  );

  server.registerTool(
    "project.list_files",
    {
      title: "List project files",
      description:
        "Lists project files under allowed folders (scene/prefab/script/docs).",
      inputSchema: {
        kind: z
          .enum(["scene", "prefab", "script", "asset", "docs", "all"])
          .default("all")
          .describe("Which file kind to list"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ kind }) => {
      try {
        const scenes = await ctx.listScenes();
        const payload: Record<string, unknown> = {};
        if (kind === "all" || kind === "scene") {
          payload.scenes = scenes.map((s) => s.path);
        }
        // Lightweight listings for other kinds without duplicating exporter FS.
        const { promises: fs } = await import("node:fs");
        const path = await import("node:path");

        async function listPrefix(prefix: string, ext?: string) {
          const root = path.join(ctx.projectRoot, prefix);
          try {
            const names = await fs.readdir(root);
            return names
              .filter((n) => (ext ? n.endsWith(ext) : true))
              .map((n) => `${prefix}/${n}`.replace(/\\/g, "/"));
          } catch {
            return [];
          }
        }

        if (kind === "all" || kind === "prefab") {
          payload.prefabs = await listPrefix("prefabs", ".prefab.json");
        }
        if (kind === "all" || kind === "script") {
          payload.scripts = await listPrefix("scripts", ".ts");
        }
        if (kind === "all" || kind === "docs") {
          payload.docs = await listPrefix("docs", ".md");
        }
        if (kind === "all" || kind === "asset") {
          payload.assetsNote =
            "Asset deep listing is limited in Phase 5; use exporters for referenced assets.";
        }
        return jsonResult(payload);
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
