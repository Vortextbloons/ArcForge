import { z } from "zod";
import { defineComponent } from "../defineComponent.js";

export const CameraSchema = z.object({
  fov: z.number().min(1).max(179).default(60),
  near: z.number().positive().default(0.1),
  far: z.number().positive().default(1000),
  /** When true, this camera is used for rendering if no other is primary. */
  primary: z.boolean().default(true),
});

export type Camera = z.infer<typeof CameraSchema>;

export const CameraComponent = defineComponent({
  id: "render.camera",
  displayName: "Camera",
  schema: CameraSchema,
  defaults: {
    fov: 60,
    near: 0.1,
    far: 1000,
    primary: true,
  },
  inspector: [
    { key: "fov", label: "Field of View", type: "number" },
    { key: "near", label: "Near Clip", type: "number" },
    { key: "far", label: "Far Clip", type: "number" },
    { key: "primary", label: "Primary", type: "boolean" },
  ],
  docs: {
    summary: "Perspective camera used for scene rendering.",
    aiUsage:
      "Place one primary camera in the scene. Transform sets look-from position/orientation.",
  },
});
