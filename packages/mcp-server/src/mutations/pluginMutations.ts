import { promises as fs } from "node:fs";
import path from "node:path";
import {
  parsePluginManifest,
  type PluginManifest,
} from "@arcforge/schemas";
import type { MutationResult } from "./types.js";
import { absUnderRoot, pathExists } from "./pathSafety.js";
import {
  discoverPlugins,
  type LoadedPlugin,
} from "../plugins/discoverPlugins.js";

export async function listPlugins(
  projectRoot: string
): Promise<LoadedPlugin[]> {
  return discoverPlugins(projectRoot);
}

export async function readPlugin(
  projectRoot: string,
  pluginIdOrFolder: string
): Promise<LoadedPlugin> {
  const plugins = await discoverPlugins(projectRoot);
  const found = plugins.find(
    (p) =>
      p.manifest.id === pluginIdOrFolder || p.folder === pluginIdOrFolder
  );
  if (!found) {
    throw new Error(`Plugin not found: ${pluginIdOrFolder}`);
  }
  return found;
}

export async function validatePlugin(
  projectRoot: string,
  pluginIdOrFolder: string
): Promise<{ ok: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  try {
    const plugin = await readPlugin(projectRoot, pluginIdOrFolder);
    if (!plugin.manifest.id) errors.push("Missing manifest id");
    if (!plugin.manifest.name) errors.push("Missing manifest name");
    for (const id of plugin.manifest.components) {
      if (!plugin.components.some((c) => c.id === id)) {
        warnings.push(
          `Manifest lists component ${id} but no .component.json found`
        );
      }
    }
    for (const doc of plugin.manifest.docs) {
      const abs = path.resolve(path.join(plugin.manifestPath, ".."), doc);
      if (!(await pathExists(abs))) {
        warnings.push(`Missing docs file: ${doc}`);
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }
  return { ok: errors.length === 0, errors, warnings };
}

export async function setPluginEnabled(
  projectRoot: string,
  pluginIdOrFolder: string,
  enabled: boolean
): Promise<MutationResult<{ id: string; enabled: boolean }>> {
  const plugin = await readPlugin(projectRoot, pluginIdOrFolder);
  const next: PluginManifest = { ...plugin.manifest, enabled };
  parsePluginManifest(next);
  await fs.writeFile(
    plugin.manifestPath,
    `${JSON.stringify(next, null, 2)}\n`,
    "utf8"
  );
  return {
    ok: true,
    paths: [`plugins/${plugin.folder}/plugin.arcforge.json`],
    data: { id: next.id, enabled },
  };
}

export async function createPlugin(
  projectRoot: string,
  input: {
    id: string;
    name: string;
    folder?: string;
    description?: string;
    componentId?: string;
  }
): Promise<MutationResult<{ path: string; id: string }>> {
  const folder =
    input.folder ??
    input.id
      .replace(/^game\./, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase();
  const root = absUnderRoot(projectRoot, `plugins/${folder}`);
  if (await pathExists(path.join(root, "plugin.arcforge.json"))) {
    throw new Error(`Plugin already exists: plugins/${folder}`);
  }

  const componentId = input.componentId ?? input.id;
  const manifest: PluginManifest = parsePluginManifest({
    id: input.id,
    name: input.name,
    version: "0.1.0",
    description: input.description ?? `${input.name} plugin`,
    enabled: true,
    components: [componentId],
    systems: [],
    docs: ["docs/overview.md", "docs/ai-usage.md"],
  });

  await fs.mkdir(path.join(root, "components"), { recursive: true });
  await fs.mkdir(path.join(root, "docs"), { recursive: true });
  await fs.mkdir(path.join(root, "scripts"), { recursive: true });

  await fs.writeFile(
    path.join(root, "plugin.arcforge.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  const shortName = componentId.split(".").pop() ?? "component";
  await fs.writeFile(
    path.join(root, "components", `${shortName}.component.json`),
    `${JSON.stringify(
      {
        id: componentId,
        displayName: input.name,
        defaults: { enabled: true },
        docs: {
          summary: `${input.name} component`,
          aiUsage: `Attach ${componentId} via scene.update_component after enabling the plugin.`,
        },
        inspector: [{ key: "enabled", label: "Enabled", type: "boolean" }],
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  await fs.writeFile(
    path.join(root, "docs", "overview.md"),
    `# ${input.name}\n\n${input.description ?? "Plugin scaffold."}\n`,
    "utf8"
  );
  await fs.writeFile(
    path.join(root, "docs", "ai-usage.md"),
    `# ${input.name} — AI usage\n\nPrefer scene/prefab edits. Component id: \`${componentId}\`.\n`,
    "utf8"
  );

  return {
    ok: true,
    paths: [
      `plugins/${folder}/plugin.arcforge.json`,
      `plugins/${folder}/components/${shortName}.component.json`,
    ],
    data: { path: `plugins/${folder}`, id: input.id },
  };
}
