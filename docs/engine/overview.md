# Engine Overview

ArcForge's runtime lives in `@arcforge/engine`. It loads portable scene/prefab JSON and drives a Three.js render loop with an ECS-style entity/component model.

## What the runtime owns

- Scene loading (`scenes/*.scene.json`)
- Entities and schema-driven components
- Transform hierarchy
- Mesh / camera / light rendering
- Script behaviours (`script.behaviour`)
- Input, events, debug logging
- Fixed-step and variable-rate updates

## What the runtime must never own

- React / Tauri / editor panels
- MCP servers or AI tools
- Arbitrary filesystem UI

## Change order (prefer earlier steps)

1. Scene / prefab JSON via editor or MCP tools
2. Isolated scripts under `scripts/`
3. New game components (schema-driven)
4. Systems / plugins
5. Engine core (only when explicitly requested)

## Related docs

- `arcforge://docs/scripting/behaviour`
- `arcforge://docs/components/core.transform`
- `arcforge://docs/ai-rules/ENGINE_RULES`
- `arcforge://docs/exporting/overview`
