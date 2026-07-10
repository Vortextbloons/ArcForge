import type { World } from "../ecs/World.js";
import type { PhysicsBackend, PhysicsBackendKind } from "./PhysicsBackend.js";
import { NullPhysicsBackend } from "./NullPhysicsBackend.js";
import {
  initRapier,
  RapierPhysicsBackend,
} from "./RapierPhysicsBackend.js";

/** Public scripting API for physics (no private Rapier types). */
export class PhysicsAPI {
  constructor(private backend: PhysicsBackend) {}

  get kind(): PhysicsBackendKind {
    return this.backend.kind;
  }

  applyImpulse(entityId: string, impulse: [number, number, number]): void {
    this.backend.applyImpulse(entityId, impulse);
  }

  setLinearVelocity(
    entityId: string,
    velocity: [number, number, number]
  ): void {
    this.backend.setLinearVelocity(entityId, velocity);
  }

  /** Internal: swap backend (e.g. after async Rapier init). */
  _setBackend(backend: PhysicsBackend): void {
    this.backend.dispose();
    this.backend = backend;
  }

  /** Internal: step simulation. */
  _step(world: World, fixedDt: number): void {
    this.backend.step(world, fixedDt);
  }

  _dispose(): void {
    this.backend.dispose();
  }
}

export async function createPhysicsBackend(
  kind: PhysicsBackendKind
): Promise<PhysicsBackend> {
  if (kind === "rapier") {
    await initRapier();
    return new RapierPhysicsBackend();
  }
  return new NullPhysicsBackend();
}
