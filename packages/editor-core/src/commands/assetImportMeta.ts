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

export function buildDefaultAssetImportSettings(
  assetRel: string,
  settingsPatch: Partial<AssetImportSettings> = {}
): AssetImportSettings {
  const posix = assetRel.replace(/\\/g, "/");
  const kind = guessAssetKind(posix);
  return parseAssetImportSettings({
    ...defaultImportSettings(posix, kind),
    ...settingsPatch,
    source: posix,
    kind,
  });
}
