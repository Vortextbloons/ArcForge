import { z } from "zod";
import { defineComponent } from "../defineComponent.js";
import { vec3 } from "../vec3.js";

export const ParticleEmitterSchema = z.object({
  rate: z.number().nonnegative().default(20),
  maxParticles: z.number().int().positive().max(10000).default(200),
  lifetime: z.number().positive().default(1),
  size: z.number().positive().default(0.1),
  color: z.string().default("#ffffff"),
  velocity: vec3([0, 1, 0]),
  spread: vec3([0.5, 0.5, 0.5]),
  looping: z.boolean().default(true),
  playing: z.boolean().default(true),
});

export type ParticleEmitter = z.infer<typeof ParticleEmitterSchema>;

export const ParticleEmitterComponent = defineComponent({
  id: "render.particles",
  displayName: "Particle Emitter",
  schema: ParticleEmitterSchema,
  defaults: {
    rate: 20,
    maxParticles: 200,
    lifetime: 1,
    size: 0.1,
    color: "#ffffff",
    velocity: [0, 1, 0],
    spread: [0.5, 0.5, 0.5],
    looping: true,
    playing: true,
  },
  inspector: [
    { key: "rate", label: "Rate", type: "number" },
    { key: "maxParticles", label: "Max Particles", type: "number" },
    { key: "lifetime", label: "Lifetime", type: "number" },
    { key: "size", label: "Size", type: "number" },
    { key: "color", label: "Color", type: "color" },
    { key: "velocity", label: "Velocity", type: "vec3" },
    { key: "spread", label: "Spread", type: "vec3" },
    { key: "looping", label: "Looping", type: "boolean" },
    { key: "playing", label: "Playing", type: "boolean" },
  ],
  docs: {
    summary: "Emits lightweight point particles for gameplay effects.",
    aiUsage:
      "Use for trails, sparks, smoke, pickups, and ambient effects; keep maxParticles bounded.",
  },
});
