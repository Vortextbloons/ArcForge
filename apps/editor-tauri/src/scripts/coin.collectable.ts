import { Behaviour, type GameContext } from "@arcforge/engine";

/** Spins a collectable coin; hides when the player is nearby. */
export default class CoinCollectable extends Behaviour {
  spinSpeed = 2;
  collectDistance = 1.2;
  collected = false;

  update(ctx: GameContext): void {
    if (this.collected) return;

    const [x, y, z] = ctx.entity.transform.rotation;
    ctx.entity.transform.rotation = [
      x,
      y + this.spinSpeed * ctx.time.delta,
      z,
    ];

    const coinPos = ctx.entity.transform.position;
    const playerPos = ctx.world.getComponent<{
      position: [number, number, number];
    }>("player", "core.transform")?.position;
    if (!playerPos) return;

    const dx = coinPos[0] - playerPos[0];
    const dz = coinPos[2] - playerPos[2];
    if (Math.hypot(dx, dz) <= this.collectDistance) {
      this.collected = true;
      ctx.events.emit("coin.collected", { entityId: ctx.entity.id });
      ctx.debug.info("Coin collected!", {
        entityId: ctx.entity.id,
        module: "scripts/coin.collectable.ts",
      });
      ctx.entity.transform.scale = [0, 0, 0];
    }
  }
}
