import { z } from "zod";

// Entity schema
export const EntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  parent: z.string().nullable(),
  components: z.record(z.unknown()),
});

export type Entity = z.infer<typeof EntitySchema>;

// Scene schema
export const SceneSchema = z.object({
  version: z.number(),
  name: z.string(),
  entities: z.array(EntitySchema),
});

export type Scene = z.infer<typeof SceneSchema>;

// Transform component
export const TransformSchema = z.object({
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  scale: z.tuple([z.number(), z.number(), z.number()]).default([1, 1, 1]),
});

export type Transform = z.infer<typeof TransformSchema>;
