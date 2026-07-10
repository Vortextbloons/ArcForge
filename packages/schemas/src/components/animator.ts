import { z } from "zod";
import { defineComponent } from "../defineComponent.js";

export const AnimatorSchema = z.object({
  clip: z.string().default(""),
  autoplay: z.boolean().default(true),
  loop: z.boolean().default(true),
  speed: z.number().positive().default(1),
  crossFade: z.number().nonnegative().default(0.15),
});

export type Animator = z.infer<typeof AnimatorSchema>;

export const AnimatorComponent = defineComponent({
  id: "animation.animator",
  displayName: "Animator",
  schema: AnimatorSchema,
  defaults: { clip: "", autoplay: true, loop: true, speed: 1, crossFade: 0.15 },
  inspector: [
    { key: "clip", label: "Clip", type: "string" },
    { key: "autoplay", label: "Autoplay", type: "boolean" },
    { key: "loop", label: "Loop", type: "boolean" },
    { key: "speed", label: "Speed", type: "number" },
    { key: "crossFade", label: "Cross Fade", type: "number" },
  ],
  docs: {
    summary: "Plays animation clips embedded in a loaded model.",
    aiUsage: "Attach beside render.mesh with a GLB asset. Empty clip selects the first animation.",
  },
});
