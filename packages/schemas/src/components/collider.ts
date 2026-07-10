import { z } from "zod";
import { defineComponent } from "../defineComponent.js";
import { vec3 } from "../vec3.js";

export const ColliderShapeSchema = z.enum(["box", "sphere", "capsule"]);

export const ColliderSchema = z.object({
  shape: ColliderShapeSchema.default("box"),
  /** Box half-extents, sphere radius in x, capsule radius/height in x/y. */
  size: vec3([0.5, 0.5, 0.5]),
  isTrigger: z.boolean().default(false),
  friction: z.number().min(0).default(0.5),
  restitution: z.number().min(0).default(0),
  offset: vec3([0, 0, 0]),
});

export type Collider = z.infer<typeof ColliderSchema>;

export const ColliderComponent = defineComponent({
  id: "physics.collider",
  displayName: "Collider",
  schema: ColliderSchema,
  defaults: {
    shape: "box",
    size: [0.5, 0.5, 0.5],
    isTrigger: false,
    friction: 0.5,
    restitution: 0,
    offset: [0, 0, 0],
  },
  inspector: [
    { key: "shape", label: "Shape", type: "enum", options: ["box", "sphere", "capsule"] },
    { key: "size", label: "Size", type: "vec3" },
    { key: "isTrigger", label: "Is Trigger", type: "boolean" },
    { key: "friction", label: "Friction", type: "number" },
    { key: "restitution", label: "Restitution", type: "number" },
    { key: "offset", label: "Offset", type: "vec3" },
  ],
  docs: {
    summary: "Collision shape attached to an entity (usually with physics.rigidbody).",
    aiUsage:
      "box size = half-extents; sphere uses size.x as radius; capsule uses size.x radius and size.y half-height.",
  },
});
