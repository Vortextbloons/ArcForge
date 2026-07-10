import type { World } from "../ecs/World.js";
import type { PhysicsBackend } from "./PhysicsBackend.js";

/** No-op backend when physics is disabled. */
export class NullPhysicsBackend implements PhysicsBackend {
  readonly kind = "none" as const;

  syncFromWorld(_world: World): void {}

  step(_world: World, _fixedDt: number): void {}

  applyImpulse(_entityId: string, _impulse: [number, number, number]): void {}

  setLinearVelocity(
    _entityId: string,
    _velocity: [number, number, number]
  ): void {}

  dispose(): void {}
}
