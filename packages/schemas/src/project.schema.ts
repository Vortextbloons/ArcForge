import { z } from "zod";

export const ProjectManifestSchema = z.object({
  name: z.string().min(1),
  engineVersion: z.string().default("0.1.0"),
  defaultScene: z.string().default("scenes/Main.scene.json"),
  render: z
    .object({
      backend: z.enum(["webgl", "webgpu"]).default("webgl"),
      antialias: z.boolean().default(true),
      shadows: z.boolean().default(true),
      toneMapping: z.enum(["none", "aces", "linear", "reinhard"]).default("aces"),
    })
    .default({}),
  physics: z
    .object({
      enabled: z.boolean().default(false),
      backend: z.enum(["rapier", "none"]).default("none"),
    })
    .default({}),
  scripting: z
    .object({
      language: z.literal("typescript").default("typescript"),
      strict: z.boolean().default(true),
    })
    .default({}),
  export: z
    .object({
      web: z.boolean().default(true),
      editableThreeProject: z.boolean().default(true),
    })
    .default({}),
});

export type ProjectManifest = z.infer<typeof ProjectManifestSchema>;

export function parseProjectManifest(data: unknown): ProjectManifest {
  return ProjectManifestSchema.parse(data);
}
