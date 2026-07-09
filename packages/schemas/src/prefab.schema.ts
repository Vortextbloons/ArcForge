import { z } from "zod";

const PrefabNodeBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  components: z.record(z.unknown()),
  children: z.array(z.lazy(() => PrefabNodeSchema)),
});

export type PrefabNode = {
  id: string;
  name: string;
  components: Record<string, unknown>;
  children: PrefabNode[];
};

export const PrefabNodeSchema: z.ZodType<PrefabNode> = PrefabNodeBaseSchema;

export const PrefabSchema = z.object({
  version: z.literal(1).or(z.number().int().positive()),
  name: z.string().min(1),
  root: PrefabNodeSchema,
});

export type Prefab = z.infer<typeof PrefabSchema>;

export function parsePrefab(data: unknown): Prefab {
  return PrefabSchema.parse(data);
}
