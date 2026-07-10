import type { World } from "../ecs/World.js";
import type { PhysicsBackend } from "./PhysicsBackend.js";
import type { PhysicsCollisionEvent, RaycastHit } from "./types.js";

/** No-op backend when physics is disabled. */
export class NullPhysicsBackend implements PhysicsBackend {
  readonly kind = "none" as const;

  syncFromWorld(_world: World): void {}

  step(_world: World, _fixedDt: number): void {}

  applyImpulse(_entityId: string, _impulse: [number, number, number]): void {}

  setLinearVelocity(_entityId: string, _velocity: [number, number, number]): void {}

  getLinearVelocity(_entityId: string): [number, number, number] | null {
    return null;
  }

  applyForce(_entityId: string, _force: [number, number, number]): void {}

  applyTorque(_entityId: string, _torque: [number, number, number]): void {}

  teleport(_entityId: string, _position: [number, number, number]): void {}

  raycast(
    _origin: [number, number, number],
    _direction: [number, number, number],
    _maxDistance: number,
    _excludeEntity?: string
  ): RaycastHit | null {
    return null;
  }

  drainCollisionEvents(): PhysicsCollisionEvent[] {
    return [];
  }

  dispose(): void {}
}
