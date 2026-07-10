import type { BehaviourConstructor } from "@arcforge/engine";
import PlayerController from "./player.controller";
import CoinCollectable from "./coin.collectable";

/** Demo script modules registered for play mode / previews. */
export const DEMO_SCRIPTS: Record<string, BehaviourConstructor> = {
  "scripts/player.controller.ts": PlayerController,
  "scripts/coin.collectable.ts": CoinCollectable,
};

export const DEMO_SCRIPT_SOURCES = [
  {
    path: "scripts/player.controller.ts",
    source: `import { Behaviour, GameContext } from "@arcforge/engine";

export default class PlayerController extends Behaviour {
  speed = 4;

  update(ctx: GameContext) {
    const move = ctx.input.getVector("move");
    ctx.entity.transform.translate(
      move.x * this.speed * ctx.time.delta,
      0,
      -move.y * this.speed * ctx.time.delta
    );
  }
}
`,
  },
  {
    path: "scripts/coin.collectable.ts",
    source: `import { Behaviour, GameContext } from "@arcforge/engine";

export default class CoinCollectable extends Behaviour {
  spinSpeed = 2;

  update(ctx: GameContext) {
    const [x, y, z] = ctx.entity.transform.rotation;
    ctx.entity.transform.rotation = [x, y + this.spinSpeed * ctx.time.delta, z];
  }
}
`,
  },
];
