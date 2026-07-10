# 11. Scripting API

Scripts are TypeScript modules that use a restricted engine API.

Example:

```ts
import { Behaviour, GameContext } from "@arcforge/engine";

export default class PlayerController extends Behaviour {
  speed = 5;

  update(ctx: GameContext) {
    const move = ctx.input.getVector("move");
    ctx.entity.transform.translate(
      move.x * this.speed * ctx.time.delta,
      0,
      move.y * this.speed * ctx.time.delta
    );
  }
}
```

Scripts may access:

```txt
ctx.time
ctx.input
ctx.entity
ctx.scene
ctx.assets
ctx.audio
ctx.physics
ctx.events
ctx.debug
```

Scripts may not access:

```txt
private engine internals
editor internals
Tauri APIs
raw filesystem APIs
Node APIs
MCP server internals
```
