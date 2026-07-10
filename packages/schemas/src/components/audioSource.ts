import { z } from "zod";
import { defineComponent } from "../defineComponent.js";

export const AudioSourceSchema = z.object({
  clip: z.string().min(1),
  autoplay: z.boolean().default(false),
  loop: z.boolean().default(false),
  volume: z.number().min(0).max(1).default(1),
  spatial: z.boolean().default(true),
  maxDistance: z.number().positive().default(100),
  playbackRate: z.number().positive().default(1),
});

export type AudioSource = z.infer<typeof AudioSourceSchema>;

export const AudioSourceComponent = defineComponent({
  id: "audio.source",
  displayName: "Audio Source",
  schema: AudioSourceSchema,
  defaults: {
    clip: "assets/audio/sound.ogg",
    autoplay: false,
    loop: false,
    volume: 1,
    spatial: true,
    maxDistance: 100,
    playbackRate: 1,
  },
  inspector: [
    { key: "clip", label: "Audio Clip", type: "asset" },
    { key: "autoplay", label: "Autoplay", type: "boolean" },
    { key: "loop", label: "Loop", type: "boolean" },
    { key: "volume", label: "Volume", type: "number" },
    { key: "spatial", label: "Spatial", type: "boolean" },
    { key: "maxDistance", label: "Max Distance", type: "number" },
    { key: "playbackRate", label: "Playback Rate", type: "number" },
  ],
  docs: {
    summary: "Plays a project audio clip in 2D or spatial 3D.",
    aiUsage:
      "Use spatial false for music and UI; use spatial true for sounds located in the world.",
  },
});
