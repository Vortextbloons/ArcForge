# 10. Component Definition System

Every component must have:

```txt
ID
schema
defaults
editor inspector metadata
runtime adapter
documentation
AI usage notes
```

Example:

```ts
export const HealthComponent = defineComponent({
  id: "game.health",
  displayName: "Health",
  schema: z.object({
    max: z.number().min(1).default(100),
    current: z.number().min(0).default(100),
    invincible: z.boolean().default(false)
  }),
  defaults: {
    max: 100,
    current: 100,
    invincible: false
  },
  inspector: [
    { key: "max", label: "Max Health", type: "number" },
    { key: "current", label: "Current Health", type: "number" },
    { key: "invincible", label: "Invincible", type: "boolean" }
  ],
  docs: {
    summary: "Adds hit points and damage state to an entity.",
    aiUsage: "Use this for players, enemies, destructible objects, and bosses."
  }
});
```

The MCP server should expose component schemas to AI through documentation resources and tools.
