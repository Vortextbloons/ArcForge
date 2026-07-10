import type { World } from "../ecs/World.js";
import type { PhysicsCollisionEvent, RaycastHit } from "./types.js";

export type PhysicsBackendKind = "none" | "rapier";

export interface PhysicsBackend {
  readonly kind: PhysicsBackendKind;
  /** Rebuild bodies/colliders from the ECS world. */
  syncFromWorld(world: World): void;
  /** Advance simulation by fixedDt seconds, then write transforms back. */
  step(world: World, fixedDt: number): void;
  /** Apply an impulse to a dynamic body (if present). */
  applyImpulse(entityId: string, impulse: [number, number, number]): void;
  /** Set linear velocity on a body (if present). */
  setLinearVelocity(entityId: string, velocity: [number, number, number]): void;
  getLinearVelocity(entityId: string): [number, number, number] | null;
  applyForce(entityId: string, force: [number, number, number]): void;
  applyTorque(entityId: string, torque: [number, number, number]): void;
  teleport(entityId: string, position: [number, number, number]): void;
  raycast(
    origin: [number, number, number],
    direction: [number, number, number],
    maxDistance: number,
    excludeEntity?: string
  ): RaycastHit | null;
  drainCollisionEvents(): PhysicsCollisionEvent[];
  dispose(): void;
}
