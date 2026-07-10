import { z } from "zod";
import { defineComponent } from "../defineComponent.js";

export const ScriptBehaviourSchema = z.object({
  /** Project-relative TypeScript module path. */
  module: z.string().min(1),
  /** Optional constructor property overrides. */
  props: z.record(z.unknown()).default({}),
  enabled: z.boolean().default(true),
});

export type ScriptBehaviour = z.infer<typeof ScriptBehaviourSchema>;

export const ScriptBehaviourComponent = defineComponent({
  id: "script.behaviour",
  displayName: "Behaviour Script",
  schema: ScriptBehaviourSchema,
  defaults: {
    module: "scripts/example.ts",
    props: {},
    enabled: true,
  },
  inspector: [
    { key: "module", label: "Module", type: "string" },
    { key: "enabled", label: "Enabled", type: "boolean" },
  ],
  docs: {
    summary: "Attaches a TypeScript Behaviour module to an entity.",
    aiUsage:
      "Set module to a project scripts/*.ts path that default-exports a Behaviour subclass. Use props for inspector-tunable fields.",
  },
});
