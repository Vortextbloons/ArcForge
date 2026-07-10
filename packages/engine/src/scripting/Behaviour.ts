import type { Scene } from "@threeforge/schemas";
import type { TimeState } from "../runtime/GameLoop.js";
import type { World } from "../ecs/World.js";
import type { InputAPI } from "../input/InputAPI.js";
import type { EventBus } from "./EventBus.js";
import type { RuntimeLogger } from "./RuntimeLogger.js";
import type { EntityHandle } from "./EntityHandle.js";

/** Public scripting context — no editor/Tauri/private engine access. */
export interface GameContext {
  time: TimeState;
  entity: EntityHandle;
  world: World;
  scene: Scene;
  input: InputAPI;
  events: EventBus;
  debug: RuntimeLogger;
}

export class Behaviour {
  /** Invoked once when the script instance starts. */
  onStart(_ctx: GameContext): void {}

  /** Variable-rate frame update. */
  update(_ctx: GameContext): void {}

  /** Fixed-rate update (physics step cadence). */
  fixedUpdate(_ctx: GameContext): void {}

  /** Invoked when the instance is destroyed or play mode stops. */
  onDestroy(_ctx: GameContext): void {}
}

export type BehaviourConstructor = new () => Behaviour;
