import type { Scene } from "@arcforge/schemas";
import type { TimeState } from "../runtime/GameLoop.js";
import type { World } from "../ecs/World.js";
import type { InputAPI } from "../input/InputAPI.js";
import type { EventBus } from "./EventBus.js";
import type { RuntimeLogger } from "./RuntimeLogger.js";
import type { EntityHandle } from "./EntityHandle.js";
import type { PhysicsAPI } from "../physics/PhysicsAPI.js";
import type { EntityAPI } from "./EntityAPI.js";
import type { AssetManager } from "../assets/AssetManager.js";
import type { AudioAPI } from "../audio/AudioSystem.js";
import type { AnimationSystem } from "../animation/AnimationSystem.js";
import type { TimerAPI } from "./TimerAPI.js";
import type { StorageAPI } from "./StorageAPI.js";
import type { SceneAPI } from "../runtime/SceneAPI.js";
import type { RuntimeExtensions } from "../plugins/RuntimeExtensions.js";
import type { ParticleSystem } from "../render/ParticleSystem.js";

/** Public scripting context — no editor/Tauri/private engine access. */
export interface GameContext {
  time: TimeState;
  entity: EntityHandle;
  entities: EntityAPI;
  assets: AssetManager;
  audio: AudioAPI;
  animation: AnimationSystem;
  timers: TimerAPI;
  storage: StorageAPI;
  scenes: SceneAPI;
  extensions: RuntimeExtensions;
  particles: ParticleSystem;
  world: World;
  scene: Scene;
  input: InputAPI;
  events: EventBus;
  debug: RuntimeLogger;
  physics: PhysicsAPI;
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
