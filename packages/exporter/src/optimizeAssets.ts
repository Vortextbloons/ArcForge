import path from "node:path";
import { copyFile, toPosix } from "./fsUtils.js";
import type { ProjectBundle } from "./types.js";

/**
 * Copy only assets referenced by scenes/prefabs into the export output.
 * Returns the list of relative asset paths that were copied.
 */
export async function copyReferencedAssets(
  bundle: ProjectBundle,
  destAssetsRoot: string
): Promise<string[]> {
  const copied: string[] = [];
  for (const rel of bundle.referencedAssets) {
    const from = path.join(bundle.root, ...rel.split("/"));
    // Strip leading "assets/" so dest is destAssetsRoot/<rest>
    const withoutPrefix = rel.startsWith("assets/") ? rel.slice("assets/".length) : rel;
    const to = path.join(destAssetsRoot, ...withoutPrefix.split("/"));
    await copyFile(from, to);
    copied.push(toPosix(rel));
  }
  return copied;
}

/**
 * MVP optimizer — currently a passthrough copy with optional size notes.
 * Hook point for compression / texture resize in later phases.
 */
export async function optimizeAssets(
  bundle: ProjectBundle,
  destAssetsRoot: string,
  enabled: boolean
): Promise<string[]> {
  void enabled;
  return copyReferencedAssets(bundle, destAssetsRoot);
}
