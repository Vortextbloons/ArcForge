import { z } from "zod";

export const AssetImportSettingsSchema = z.object({
  version: z.literal(1).default(1),
  /** Relative path under assets/ */
  source: z.string().min(1),
  kind: z.enum(["model", "texture", "audio", "other"]).default("other"),
  scale: z.number().positive().default(1),
  yUp: z.boolean().default(true),
  generateColliders: z.boolean().default(false),
  maxTextureSize: z.number().int().positive().default(2048),
  compressTextures: z.boolean().default(false),
});

export type AssetImportSettings = z.infer<typeof AssetImportSettingsSchema>;

export function parseAssetImportSettings(data: unknown): AssetImportSettings {
  return AssetImportSettingsSchema.parse(data);
}

export function defaultImportSettings(
  source: string,
  kind: AssetImportSettings["kind"] = "other"
): AssetImportSettings {
  return AssetImportSettingsSchema.parse({ source, kind });
}
