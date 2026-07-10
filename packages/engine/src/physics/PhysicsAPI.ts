import type { World } from "../ecs/World.js";
import type { PhysicsBackend, PhysicsBackendKind } from "./PhysicsBackend.js";
import { NullPhysicsBackend } from "./NullPhysicsBackend.js";
import { initRapier, RapierPhysicsBackend } from "./RapierPhysicsBackend.js";
import type { PhysicsCollisionEvent, PhysicsCollisionListener, RaycastHit } from "./types.js";

/** Public scripting API for physics (no private Rapier types). */
export class PhysicsAPI {
  private readonly pendingVelocity = new Map<string, [number, number, number]>();
  private readonly collisionListeners = new Set<PhysicsCollisionListener>();

  constructor(private backend: PhysicsBackend) {}

  get kind(): PhysicsBackendKind {
    return this.backend.kind;
  }

  applyImpulse(entityId: string, impulse: [number, number, number]): void {
    this.backend.applyImpulse(entityId, impulse);
  }

  setLinearVelocity(entityId: string, velocity: [number, number, number]): void {
    // Bodies are created during the physics step — queue until then.
    this.pendingVelocity.set(entityId, velocity);
    this.backend.setLinearVelocity(entityId, velocity);
  }

  getLinearVelocity(entityId: string): [number, number, number] | null {
    return this.backend.getLinearVelocity(entityId);
  }

  applyForce(entityId: string, force: [number, number, number]): void {
    this.backend.applyForce(entityId, force);
  }

  applyTorque(entityId: string, torque: [number, number, number]): void {
    this.backend.applyTorque(entityId, torque);
  }

  teleport(entityId: string, position: [number, number, number]): void {
    this.backend.teleport(entityId, position);
  }

  raycast(
    origin: [number, number, number],
    direction: [number, number, number],
    maxDistance = 1000,
    excludeEntity?: string
  ): RaycastHit | null {
    return this.backend.raycast(origin, direction, maxDistance, excludeEntity);
  }

  onCollision(listener: PhysicsCollisionListener): () => void {
    this.collisionListeners.add(listener);
    return () => this.collisionListeners.delete(listener);
  }

  /** Internal: swap backend (e.g. after async Rapier init). */
  _setBackend(backend: PhysicsBackend): void {
    this.backend.dispose();
    this.backend = backend;
  }

  /** Internal: step simulation. */
  _step(world: World, fixedDt: number): void {
    this.backend.step(world, fixedDt);
    this.publishCollisions(this.backend.drainCollisionEvents());
    if (this.pendingVelocity.size > 0) {
      for (const [id, velocity] of this.pendingVelocity) {
        this.backend.setLinearVelocity(id, velocity);
      }
      this.pendingVelocity.clear();
    }
  }

  _dispose(): void {
    this.pendingVelocity.clear();
    this.collisionListeners.clear();
    this.backend.dispose();
  }

  private publishCollisions(events: PhysicsCollisionEvent[]): void {
    for (const event of events) {
      for (const listener of this.collisionListeners) listener(event);
    }
  }
}

export async function createPhysicsBackend(kind: PhysicsBackendKind): Promise<PhysicsBackend> {
  if (kind === "rapier") {
    await initRapier();
    return new RapierPhysicsBackend();
  }
  return new NullPhysicsBackend();
}
