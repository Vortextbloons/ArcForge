import { z } from "zod";

const PrefabNodeBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  components: z.record(z.unknown()),
  children: z.array(z.lazy(() => PrefabNodeSchema)),
  /** Optional nested prefab source merged into this node. */
  prefab: z.string().optional(),
  overrides: z.record(z.unknown()).optional(),
});

export type PrefabNode = {
  id: string;
  name: string;
  components: Record<string, unknown>;
  children: PrefabNode[];
  prefab?: string;
  overrides?: Record<string, unknown>;
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
