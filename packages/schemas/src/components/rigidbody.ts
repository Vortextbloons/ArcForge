import { z } from "zod";
import { defineComponent } from "../defineComponent.js";
import { vec3 } from "../vec3.js";

export const RigidbodyTypeSchema = z.enum(["dynamic", "kinematic", "static"]);

export const RigidbodySchema = z.object({
  type: RigidbodyTypeSchema.default("dynamic"),
  mass: z.number().positive().default(1),
  linearDamping: z.number().min(0).default(0),
  angularDamping: z.number().min(0).default(0),
  gravityScale: z.number().default(1),
  /** Initial linear velocity (m/s). */
  velocity: vec3([0, 0, 0]),
  lockRotation: z.boolean().default(false),
});

export type Rigidbody = z.infer<typeof RigidbodySchema>;

export const RigidbodyComponent = defineComponent({
  id: "physics.rigidbody",
  displayName: "Rigidbody",
  schema: RigidbodySchema,
  defaults: {
    type: "dynamic",
    mass: 1,
    linearDamping: 0,
    angularDamping: 0,
    gravityScale: 1,
    velocity: [0, 0, 0],
    lockRotation: false,
  },
  inspector: [
    { key: "type", label: "Type", type: "enum", options: ["dynamic", "kinematic", "static"] },
    { key: "mass", label: "Mass", type: "number" },
    { key: "linearDamping", label: "Linear Damping", type: "number" },
    { key: "angularDamping", label: "Angular Damping", type: "number" },
    { key: "gravityScale", label: "Gravity Scale", type: "number" },
    { key: "velocity", label: "Velocity", type: "vec3" },
    { key: "lockRotation", label: "Lock Rotation", type: "boolean" },
  ],
  docs: {
    summary: "Physics body — dynamic, kinematic, or static.",
    aiUsage:
      "Pair with physics.collider. Use dynamic for falling/moving objects, kinematic for script-driven motion, static for ground.",
  },
});
