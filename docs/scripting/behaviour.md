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
| `ctx.input`      | `getVector("move")`, key queries                             |
| `ctx.entity`     | `transform`, `getComponent`, `id`                            |
| `ctx.entities`   | Spawn, destroy, find, query, parent, and component lifecycle |
| `ctx.world`      | Low-level ECS queries                                        |
| `ctx.scene`      | Current scene snapshot                                       |
| `ctx.events`     | `on` / `emit`                                                |
| `ctx.debug`      | `info` / `warn` / `error` (console panel)                    |
| `ctx.physics`    | Forces, velocity, teleport, raycast, and collision events    |
| `ctx.assets`     | Cached model, texture, and audio loading                     |
| `ctx.audio`      | Play and control `audio.source` entities                     |
| `ctx.animation`  | Play and stop model animations                               |
| `ctx.timers`     | Game-time timeouts, intervals, and waits                     |
| `ctx.scenes`     | Registered scene transitions                                 |
| `ctx.storage`    | Namespaced JSON save data                                    |
| `ctx.extensions` | Register game-owned systems and render adapters              |
| `ctx.particles`  | Trigger bursts on `render.particles` emitters                |

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
