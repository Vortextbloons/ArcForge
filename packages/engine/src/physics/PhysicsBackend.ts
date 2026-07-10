import type { World } from "../ecs/World.js";

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
  dispose(): void;
}
