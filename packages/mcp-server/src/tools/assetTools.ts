import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  importAssetFile,
  readAssetImportSettings,
  updateAssetImportSettings,
} from "@arcforge/editor-core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import { withPermission, recordWriteSuccess } from "../toolGate.js";
import { errorResult, jsonResult } from "../toolResult.js";
import { absUnderRoot, normalizeProjectRel, pathExists } from "../mutations/pathSafety.js";

async function listAssetFiles(projectRoot: string): Promise<string[]> {
  const root = path.join(projectRoot, "assets");
  const results: string[] = [];
  async function walk(current: string, rel = "assets"): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const nextRel = `${rel}/${entry.name}`;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full, nextRel);
      else if (entry.isFile() && !entry.name.endsWith(".import.json")) {
        results.push(nextRel.replace(/\\/g, "/"));
      }
    }
  }
  await walk(root);
  return results.sort();
}

export function registerAssetTools(
  server: McpServer,
  ctx: ProjectContext
): void {
  server.registerTool(
    "asset.list",
    {
      title: "List assets",
      description: "Lists files under assets/ (excludes .import.json sidecars).",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () =>
      withPermission(ctx, "asset.list", async () => {
        const assets = await listAssetFiles(ctx.projectRoot);
        return jsonResult({ assets });
      })
  );

  server.registerTool(
    "asset.get_import_settings",
    {
      title: "Get asset import settings",
      description: "Reads assets/<file>.import.json (defaults if missing).",
      inputSchema: {
        asset: z.string().describe('Path under assets/, e.g. "assets/models/coin.glb"'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ asset }) =>
      withPermission(ctx, "asset.get_import_settings", async () => {
        try {
          const rel = normalizeProjectRel(asset, "assets/");
          const settings = await readAssetImportSettings(ctx.projectRoot, rel);
          return jsonResult({ asset: rel, settings });
        } catch (err) {
          return errorResult(err instanceof Error ? err.message : String(err));
        }
      })
  );

  server.registerTool(
    "asset.update_import_settings",
    {
      title: "Update asset import settings",
      description: "Patches assets/<file>.import.json.",
      inputSchema: {
        asset: z.string(),
        patch: z.record(z.unknown()),
      },
    },
    async ({ asset, patch }) =>
      withPermission(ctx, "asset.update_import_settings", async () => {
        try {
          const rel = normalizeProjectRel(asset, "assets/");
          const settings = await updateAssetImportSettings(
            ctx.projectRoot,
            rel,
            patch as Parameters<typeof updateAssetImportSettings>[2]
          );
          await recordWriteSuccess(
            ctx,
            "asset.update_import_settings",
            `Updated import settings for ${rel}`,
            [`${rel}.import.json`]
          );
          return jsonResult({ asset: rel, settings });
        } catch (err) {
          return errorResult(err instanceof Error ? err.message : String(err));
        }
      })
  );

  server.registerTool(
    "asset.import",
    {
      title: "Import asset",
      description:
        "Copies a file into assets/ and writes import settings. Source must be an absolute path the user approved.",
      inputSchema: {
        source: z.string().describe("Absolute path to source file"),
        dest: z
          .string()
          .describe('Destination under assets/, e.g. "assets/models/hero.glb"'),
        settings: z.record(z.unknown()).optional(),
      },
    },
    async ({ source, dest, settings }) =>
      withPermission(ctx, "asset.import", async () => {
        try {
          if (!path.isAbsolute(source)) {
            return errorResult("source must be an absolute filesystem path");
          }
          if (!(await pathExists(source))) {
            return errorResult(`Source not found: ${source}`);
          }
          const rel = normalizeProjectRel(dest, "assets/");
          const result = await importAssetFile(
            ctx.projectRoot,
            source,
            rel,
            (settings ?? {}) as Parameters<typeof importAssetFile>[3]
          );
          await recordWriteSuccess(ctx, "asset.import", `Imported ${rel}`, [
            rel,
            `${rel}.import.json`,
          ]);
          return jsonResult(result);
        } catch (err) {
          return errorResult(err instanceof Error ? err.message : String(err));
        }
      })
  );

  server.registerTool(
    "asset.inspect",
    {
      title: "Inspect asset",
      description: "Returns size + import settings for one asset.",
      inputSchema: { asset: z.string() },
      annotations: { readOnlyHint: true },
    },
    async ({ asset }) =>
      withPermission(ctx, "asset.inspect", async () => {
        try {
          const rel = normalizeProjectRel(asset, "assets/");
          const abs = absUnderRoot(ctx.projectRoot, rel);
          if (!(await pathExists(abs))) {
            return errorResult(`Asset not found: ${rel}`);
          }
          const stat = await fs.stat(abs);
          const settings = await readAssetImportSettings(ctx.projectRoot, rel);
          return jsonResult({
            asset: rel,
            bytes: stat.size,
            settings,
          });
        } catch (err) {
          return errorResult(err instanceof Error ? err.message : String(err));
        }
      })
  );
}
