import { Behaviour, type GameContext } from "@arcforge/engine";

/**
 * Demo player controller: WASD / arrow keys move on XZ.
 */
export default class PlayerController extends Behaviour {
  speed = 4;

  onStart(ctx: GameContext): void {
    ctx.debug.info("PlayerController started", {
      entityId: ctx.entity.id,
      module: "scripts/player.controller.ts",
    });
  }

  update(ctx: GameContext): void {
    const move = ctx.input.getVector("move");
    if (move.x === 0 && move.y === 0) return;
    ctx.entity.transform.translate(
      move.x * this.speed * ctx.time.delta,
      0,
      -move.y * this.speed * ctx.time.delta
    );
  }
}
