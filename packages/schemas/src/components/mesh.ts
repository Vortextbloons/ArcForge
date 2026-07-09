import { z } from "zod";
import { defineComponent } from "../defineComponent.js";

export const MeshPrimitiveSchema = z.enum([
  "box",
  "sphere",
  "plane",
  "cylinder",
  "capsule",
]);

export const MeshSchema = z.object({
  /** Built-in primitive when no asset is set. */
  primitive: MeshPrimitiveSchema.default("box"),
  /** Optional path to a mesh/model asset (e.g. GLB). */
  asset: z.string().optional(),
  /** Hex color for the default material. */
  color: z.string().default("#888888"),
  castShadow: z.boolean().default(true),
  receiveShadow: z.boolean().default(true),
});

export type Mesh = z.infer<typeof MeshSchema>;

export const MeshComponent = defineComponent({
  id: "render.mesh",
  displayName: "Mesh",
  schema: MeshSchema,
  defaults: {
    primitive: "box",
    color: "#888888",
    castShadow: true,
    receiveShadow: true,
  },
  inspector: [
    {
      key: "primitive",
      label: "Primitive",
      type: "enum",
      options: ["box", "sphere", "plane", "cylinder", "capsule"],
    },
    { key: "asset", label: "Asset", type: "asset" },
    { key: "color", label: "Color", type: "color" },
    { key: "castShadow", label: "Cast Shadow", type: "boolean" },
    { key: "receiveShadow", label: "Receive Shadow", type: "boolean" },
  ],
  docs: {
    summary: "Renders a mesh primitive or loaded model asset.",
    aiUsage:
      "Use primitive meshes for prototypes. Set asset to a GLB path for authored models.",
  },
});
