import { z } from "zod";
import { defineComponent } from "../defineComponent.js";
import { vec3 } from "../vec3.js";

export const LightTypeSchema = z.enum(["directional", "point", "ambient", "hemi"]);

export const LightSchema = z.object({
  type: LightTypeSchema.default("directional"),
  color: z.string().default("#ffffff"),
  intensity: z.number().min(0).default(1),
  castShadow: z.boolean().default(false),
  /** Direction for directional lights (normalized preferred). */
  direction: vec3([0, -1, 0]),
});

export type Light = z.infer<typeof LightSchema>;

export const LightComponent = defineComponent({
  id: "render.light",
  displayName: "Light",
  schema: LightSchema,
  defaults: {
    type: "directional",
    color: "#ffffff",
    intensity: 1,
    castShadow: false,
    direction: [0, -1, 0],
  },
  inspector: [
    {
      key: "type",
      label: "Type",
      type: "enum",
      options: ["directional", "point", "ambient", "hemi"],
    },
    { key: "color", label: "Color", type: "color" },
    { key: "intensity", label: "Intensity", type: "number" },
    { key: "castShadow", label: "Cast Shadow", type: "boolean" },
    { key: "direction", label: "Direction", type: "vec3" },
  ],
  docs: {
    summary: "Scene lighting (directional, point, ambient, or hemisphere).",
    aiUsage:
      "Use one directional + ambient for a basic lit scene. Enable castShadow on a single main light.",
  },
});
