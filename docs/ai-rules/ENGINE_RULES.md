# Engine Rules for AI

Prefer these change types in order:

1. Scene JSON edits through MCP tools.
2. Prefab edits through MCP tools.
3. New isolated scripts.
4. New game components.
5. New plugins.
6. Engine core modifications only when explicitly requested.

Do not directly modify:

- engine/render/private
- engine/core/game-loop
- generated files (`.generated/`)
- build output
- package lockfiles unless installing dependencies was approved

## Required docs workflow

Before non-trivial edits, call:

```txt
docs.get_relevant
project.get_info
component.list
scene.open
```

Before writing scripts:

```txt
docs.read arcforge://docs/scripting/behaviour
script.create / script.edit
build.get_errors (typecheck)
```

Use only documented methods. Common false friends:

- `ctx.entities.get(id)` — not `.find(id)`
- `ctx.input.getPointer()` — not `getMouseDelta` / `getScrollDelta`
- `ctx.input.isKeyPressed("Space")` or `getButtonPressed("jump")` — not `getKeyDown`
- Live handles come from `ctx.entities` / `ctx.entity` — not `ctx.scene.entities`

Before adding components:

```txt
component.get_schema
```

Before exporting:

```txt
build.get_errors
```

## Performance defaults

Prefer instancing, material reuse, asset reuse, pooling, and lazy loading.
Avoid unique materials per instance, huge textures, and per-frame allocations.
