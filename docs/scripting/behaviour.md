# Behaviour Scripting API

Scripts are TypeScript modules that **default-export** a class extending `Behaviour`.

```ts
import { Behaviour, type GameContext } from "@arcforge/engine";

export default class PlayerController extends Behaviour {
  speed = 5;

  update(ctx: GameContext) {
    const move = ctx.input.getVector("move");
    ctx.entity.transform.translate(
      move.x * this.speed * ctx.time.delta,
      0,
      -move.y * this.speed * ctx.time.delta
    );
  }
}
```

## Lifecycle

- `onStart(ctx)` — once when the instance starts (play mode)
- `update(ctx)` — every frame
- `fixedUpdate(ctx)` — fixed timestep
- `onDestroy(ctx)` — when play stops or the component is removed

## GameContext

| API              | Purpose                                                      |
| ---------------- | ------------------------------------------------------------ |
| `ctx.time`       | `delta`, `elapsed`, `fixedDelta`                             |
| `ctx.input`      | Actions, keys, pointer (see Input below)                     |
| `ctx.entity`     | Current `EntityHandle`: `id`, `transform`, `getComponent`    |
| `ctx.entities`   | `EntityAPI`: lookup, spawn, destroy, query (see Entities)    |
| `ctx.world`      | Low-level ECS: `get(id)`, `query(...components)`             |
| `ctx.scene`      | Authoring snapshot (`{ version, name, entities[] }`) — not live handles |
| `ctx.events`     | `on` / `emit`                                                |
| `ctx.debug`      | `info` / `warn` / `error` (console panel)                    |
| `ctx.physics`    | Forces, velocity, teleport, raycast, collision events        |
| `ctx.assets`     | Cached model, texture, and audio loading                     |
| `ctx.audio`      | Play and control `audio.source` entities                     |
| `ctx.animation`  | Play and stop model animations                               |
| `ctx.timers`     | Game-time timeouts, intervals, and waits                     |
| `ctx.scenes`     | Registered scene transitions                                 |
| `ctx.storage`    | Namespaced JSON save data                                    |
| `ctx.extensions` | Register game-owned systems and render adapters              |
| `ctx.particles`  | Trigger bursts on `render.particles` emitters                |

## Entities (`ctx.entities`)

`ctx.entities` is an **`EntityAPI` object**, not an array. Use these methods only:

| Method | Purpose |
| ------ | ------- |
| `get(id)` | Live `EntityHandle` or `undefined` |
| `require(id)` | Live handle or throw |
| `findByName(name)` | First entity with that name |
| `query(...componentIds)` | Handles that have all listed components |
| `all()` | All live handles |
| `spawn({ name?, components? })` | Create entity |
| `spawnPrefab(path, options?)` | Instantiate prefab |
| `destroy(idOrHandle)` | Destroy entity |
| `addComponent` / `setComponent` / `removeComponent` | Component lifecycle |
| `rename` / `setParent` | Hierarchy |

```ts
const camera = ctx.entities.get(this.cameraId);
if (!camera) return;
const pos = camera.transform.position;
```

### Do not invent

| Wrong | Right |
| ----- | ----- |
| `ctx.entities.find(id)` | `ctx.entities.get(id)` |
| `ctx.scene.entities[i]` as a live handle | `ctx.entities.get(id)` — scene JSON has no `getComponent` / live `transform` |
| `handle.getComponent("script.behaviour")` as a Behaviour class | Returns `{ module, props, enabled }` data only. Cross-script talk uses `ctx.events`, shared components, or transform math on this script |

There is **no** public API to fetch another entity's Behaviour instance (`getForward()` on a camera script will not work via `getComponent`).

## Input (`ctx.input`)

| Method | Purpose |
| ------ | ------- |
| `getVector(action)` | Default `"move"` → `{ x, y }` |
| `getAxis(action)` | Default `"horizontal"` / `"vertical"` |
| `getButton(action)` / `getButtonPressed(action)` | Default `"jump"` |
| `getKey(name)` | Held key (`"space"`, `"shift"`, `"w"`, …) |
| `isKeyDown(code)` / `isKeyPressed(code)` / `isKeyReleased(code)` | Keyboard by `KeyW`-style code |
| `getPointer()` | `{ x, y, deltaX, deltaY, wheel, locked }` |
| `getMouseButton(button)` | Mouse button held |
| `requestPointerLock(element)` / `exitPointerLock()` | Pointer lock |

```ts
const pointer = ctx.input.getPointer();
this.yaw -= pointer.deltaX * this.sensitivity;
this.pitch -= pointer.deltaY * this.sensitivity;
this.distance += pointer.wheel * 0.01;
```

### Do not invent

| Wrong | Right |
| ----- | ----- |
| `getMouseDelta()` | `getPointer().deltaX` / `.deltaY` |
| `getScrollDelta()` / `getMouse()` | `getPointer().wheel` / `getPointer()` |
| `getKeyDown("space")` | `isKeyPressed("Space")` or `getButtonPressed("jump")` |

## Physics (`ctx.physics`)

```ts
ctx.physics.applyImpulse(ctx.entity.id, [0, 5, 0]);
ctx.physics.setLinearVelocity(ctx.entity.id, [vx, vy, vz]);
const vel = ctx.physics.getLinearVelocity(ctx.entity.id);
const hit = ctx.physics.raycast([x, y, z], [0, -1, 0], 1);
ctx.physics.onCollision((event) => { /* … */ });
```

## Scene binding

```json
"script.behaviour": {
  "module": "scripts/player.controller.ts",
  "props": { "speed": 4 },
  "enabled": true
}
```

Modules must be registered on the runtime (`runtime.registerScript(...)`) before play.

Project scripts may import relative helper modules, `@arcforge/engine`, and `three`. Helper modules do not need a default export. Plugin runtime systems live under `plugins/<plugin>/systems/*.system.ts` and default-export a `RuntimeSystem` object.

## Before writing scripts

1. Read this doc (`arcforge://docs/scripting/behaviour`).
2. Prefer examples under `examples/*/scripts/`.
3. Typecheck after edits — invented methods must fail typecheck.
4. Do not copy Unity / Godot / Three.js editor APIs; only the tables above are public.
