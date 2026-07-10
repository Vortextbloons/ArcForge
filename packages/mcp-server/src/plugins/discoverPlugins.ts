import { promises as fs } from "node:fs";
import path from "node:path";
import {
  parsePluginManifest,
  parsePluginComponentDef,
  type PluginManifest,
  type PluginComponentDef,
} from "@arcforge/schemas";

export interface LoadedPlugin {
  folder: string;
  manifestPath: string;
  manifest: PluginManifest;
  components: PluginComponentDef[];
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

/** Discover plugins under projectRoot/plugins/<name>/plugin.arcforge.json. */
export async function discoverPlugins(
  projectRoot: string
): Promise<LoadedPlugin[]> {
  const pluginsRoot = path.join(projectRoot, "plugins");
  if (!(await pathExists(pluginsRoot))) return [];

  const entries = await fs.readdir(pluginsRoot, { withFileTypes: true });
  const loaded: LoadedPlugin[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folder = path.join(pluginsRoot, entry.name);
    const manifestPath = path.join(folder, "plugin.arcforge.json");
    if (!(await pathExists(manifestPath))) continue;

    try {
      const raw = JSON.parse(await fs.readFile(manifestPath, "utf8")) as unknown;
      const manifest = parsePluginManifest(raw);
      const components = await loadPluginComponents(folder, manifest);
      loaded.push({
        folder: entry.name,
        manifestPath,
        manifest,
        components,
      });
    } catch {
      // Skip invalid manifests.
    }
  }

  return loaded.sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));
}

async function loadPluginComponents(
  folder: string,
  manifest: PluginManifest
): Promise<PluginComponentDef[]> {
  const componentsDir = path.join(folder, "components");
  const defs: PluginComponentDef[] = [];
  if (!(await pathExists(componentsDir))) return defs;

  const files = await fs.readdir(componentsDir);
  for (const file of files) {
    if (!file.endsWith(".component.json")) continue;
    const abs = path.join(componentsDir, file);
    try {
      const raw = JSON.parse(await fs.readFile(abs, "utf8")) as unknown;
      const def = parsePluginComponentDef(raw);
      if (
        manifest.components.length === 0 ||
        manifest.components.includes(def.id)
      ) {
        defs.push(def);
      }
    } catch {
      // skip
    }
  }
  return defs;
}
