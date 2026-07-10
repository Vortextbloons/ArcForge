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

| API          | Purpose                                   |
| ------------ | ----------------------------------------- |
| `ctx.time`   | `delta`, `elapsed`, `fixedDelta`          |
| `ctx.input`  | `getVector("move")`, key queries          |
| `ctx.entity` | `transform`, `getComponent`, `id`         |
| `ctx.world`  | ECS queries                               |
| `ctx.scene`  | Current scene snapshot                    |
| `ctx.events` | `on` / `emit`                             |
| `ctx.debug`  | `info` / `warn` / `error` (console panel) |

## Scene binding

```json
"script.behaviour": {
  "module": "scripts/player.controller.ts",
  "props": { "speed": 4 },
  "enabled": true
}
```

Modules must be registered on the runtime (`runtime.registerScript(...)`) before play.
