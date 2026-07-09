import { z } from "zod";

export const EntitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  parent: z.string().nullable().default(null),
  /** Component id → component data. Validated per-component when loading. */
  components: z.record(z.unknown()).default({}),
  /** Optional prefab source path. */
  prefab: z.string().optional(),
  /** Sparse overrides applied on top of prefab defaults. */
  overrides: z.record(z.unknown()).optional(),
});

export type Entity = z.infer<typeof EntitySchema>;

export const SceneSchema = z.object({
  version: z.literal(1).or(z.number().int().positive()),
  name: z.string().min(1),
  entities: z.array(EntitySchema).default([]),
});

export type Scene = z.infer<typeof SceneSchema>;

export function parseScene(data: unknown): Scene {
  return SceneSchema.parse(data);
}

export function safeParseScene(data: unknown) {
  return SceneSchema.safeParse(data);
}
