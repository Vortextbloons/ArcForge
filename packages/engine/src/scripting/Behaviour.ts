/**
 * Public scripting API surface (Phase 3 expands this).
 * Kept minimal so Phase 1 runtime remains editor-free.
 */

import type { TimeState } from "../runtime/GameLoop.js";
import type { EntityRecord } from "../ecs/types.js";
import type { World } from "../ecs/World.js";
import type { Scene } from "@threeforge/schemas";

export interface GameContext {
  time: TimeState;
  entity: EntityRecord;
  world: World;
  scene: Scene;
}

export class Behaviour {
  onStart?(_ctx: GameContext): void {}
  update(_ctx: GameContext): void {}
  fixedUpdate(_ctx: GameContext): void {}
  onDestroy?(_ctx: GameContext): void {}
}
