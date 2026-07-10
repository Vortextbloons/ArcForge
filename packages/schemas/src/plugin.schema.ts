import { z } from "zod";

export const PluginManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().default("0.1.0"),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  components: z.array(z.string()).default([]),
  systems: z.array(z.string()).default([]),
  docs: z.array(z.string()).default([]),
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

export function parsePluginManifest(data: unknown): PluginManifest {
  return PluginManifestSchema.parse(data);
}

/** JSON component definition shipped inside a plugin (no TS compile required). */
export const PluginComponentDefSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  defaults: z.record(z.unknown()).default({}),
  docs: z
    .object({
      summary: z.string(),
      aiUsage: z.string().optional(),
    })
    .default({ summary: "" }),
  inspector: z
    .array(
      z.object({
        key: z.string(),
        label: z.string().optional(),
        type: z.string().default("string"),
        options: z.array(z.string()).optional(),
      })
    )
    .default([]),
});

export type PluginComponentDef = z.infer<typeof PluginComponentDefSchema>;

export function parsePluginComponentDef(data: unknown): PluginComponentDef {
  return PluginComponentDefSchema.parse(data);
}
