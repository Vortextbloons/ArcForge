import { promises as fs } from "node:fs";
import path from "node:path";
import {
  defaultImportSettings,
  parseAssetImportSettings,
  type AssetImportSettings,
} from "@arcforge/schemas";

export function assetImportSettingsPath(assetRel: string): string {
  return `${assetRel}.import.json`;
}

export function guessAssetKind(rel: string): AssetImportSettings["kind"] {
  const lower = rel.toLowerCase();
  if (/\.(glb|gltf|fbx|obj)$/.test(lower)) return "model";
  if (/\.(png|jpe?g|webp|ktx2)$/.test(lower)) return "texture";
  if (/\.(mp3|ogg|wav)$/.test(lower)) return "audio";
  return "other";
}

/** Copy a file into assets/ and write sidecar import settings. */
export async function importAssetFile(
  projectRoot: string,
  sourceAbs: string,
  destRel: string,
  settingsPatch: Partial<AssetImportSettings> = {}
): Promise<{ path: string; settings: AssetImportSettings }> {
  const posix = destRel.replace(/\\/g, "/");
  if (!posix.startsWith("assets/") || posix.includes("..")) {
    throw new Error(`Destination must be under assets/: ${destRel}`);
  }

  const destAbs = path.join(projectRoot, ...posix.split("/"));
  await fs.mkdir(path.dirname(destAbs), { recursive: true });
  await fs.copyFile(sourceAbs, destAbs);

  const kind = guessAssetKind(posix);
  const settings = parseAssetImportSettings({
    ...defaultImportSettings(posix, kind),
    ...settingsPatch,
    source: posix,
    kind,
  });
  const metaAbs = path.join(
    projectRoot,
    ...assetImportSettingsPath(posix).split("/")
  );
  await fs.writeFile(metaAbs, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return { path: posix, settings };
}

export async function readAssetImportSettings(
  projectRoot: string,
  assetRel: string
): Promise<AssetImportSettings> {
  const posix = assetRel.replace(/\\/g, "/");
  const metaAbs = path.join(
    projectRoot,
    ...assetImportSettingsPath(posix).split("/")
  );
  try {
    return parseAssetImportSettings(
      JSON.parse(await fs.readFile(metaAbs, "utf8")) as unknown
    );
  } catch {
    return defaultImportSettings(posix, guessAssetKind(posix));
  }
}

export async function updateAssetImportSettings(
  projectRoot: string,
  assetRel: string,
  patch: Partial<AssetImportSettings>
): Promise<AssetImportSettings> {
  const posix = assetRel.replace(/\\/g, "/");
  const current = await readAssetImportSettings(projectRoot, posix);
  const next = parseAssetImportSettings({
    ...current,
    ...patch,
    source: posix,
  });
  const metaAbs = path.join(
    projectRoot,
    ...assetImportSettingsPath(posix).split("/")
  );
  await fs.mkdir(path.dirname(metaAbs), { recursive: true });
  await fs.writeFile(metaAbs, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}
