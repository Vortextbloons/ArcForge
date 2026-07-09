import { z } from "zod";
import { defineComponent } from "../defineComponent.js";
import { vec3 } from "../vec3.js";

export const TransformSchema = z.object({
  position: vec3([0, 0, 0]),
  rotation: vec3([0, 0, 0]),
  scale: vec3([1, 1, 1]),
});

export type Transform = z.infer<typeof TransformSchema>;

export const TransformComponent = defineComponent({
  id: "core.transform",
  displayName: "Transform",
  schema: TransformSchema,
  defaults: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  },
  inspector: [
    { key: "position", label: "Position", type: "vec3" },
    { key: "rotation", label: "Rotation", type: "vec3" },
    { key: "scale", label: "Scale", type: "vec3" },
  ],
  docs: {
    summary: "Local position, rotation (Euler radians), and scale.",
    aiUsage:
      "Attach to every spatial entity. Parent entities compose transforms in hierarchy order.",
  },
});
