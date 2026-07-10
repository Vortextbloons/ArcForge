import RAPIER from "@dimforge/rapier3d-compat";
import type { Collider, Rigidbody, Transform } from "@arcforge/schemas";
import type { World } from "../ecs/World.js";
import type { PhysicsBackend } from "./PhysicsBackend.js";
import type { PhysicsCollisionEvent, RaycastHit } from "./types.js";

const TRANSFORM = "core.transform";
const RIGIDBODY = "physics.rigidbody";
const COLLIDER = "physics.collider";

interface BodyEntry {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider | null;
  signature: string;
}

let rapierReady: Promise<void> | null = null;

export async function initRapier(): Promise<void> {
  if (!rapierReady) {
    rapierReady = RAPIER.init();
  }
  await rapierReady;
}

/**
 * Thin Rapier wrapper. Call `initRapier()` once before constructing.
 */
export class RapierPhysicsBackend implements PhysicsBackend {
  readonly kind = "rapier" as const;
  private readonly world: RAPIER.World;
  private readonly bodies = new Map<string, BodyEntry>();
  private readonly colliderEntities = new Map<number, string>();
  private readonly collisionEvents: PhysicsCollisionEvent[] = [];
  private readonly eventQueue = new RAPIER.EventQueue(true);
  private disposed = false;

  constructor(gravity: [number, number, number] = [0, -9.81, 0]) {
    this.world = new RAPIER.World({
      x: gravity[0],
      y: gravity[1],
      z: gravity[2],
    });
  }

  syncFromWorld(ecs: World): void {
    const alive = new Set<string>();

    for (const entity of ecs.query(TRANSFORM, RIGIDBODY)) {
      const transform = ecs.getComponent<Transform>(entity.id, TRANSFORM);
      const rigidbody = ecs.getComponent<Rigidbody>(entity.id, RIGIDBODY);
      if (!transform || !rigidbody) continue;

      const collider = ecs.getComponent<Collider>(entity.id, COLLIDER);
      const signature = bodySignature(rigidbody, collider, transform);
      alive.add(entity.id);

      const existing = this.bodies.get(entity.id);
      if (existing && existing.signature === signature) {
        // Kinematic: push transform into Rapier each sync.
        if (rigidbody.type === "kinematic") {
          existing.body.setNextKinematicTranslation({
            x: transform.position[0],
            y: transform.position[1],
            z: transform.position[2],
          });
          const q = eulerToQuat(transform.rotation);
          existing.body.setNextKinematicRotation(q);
        } else if (rigidbody.type === "dynamic" && rigidbody.lockRotation) {
          // Arcade / script-driven yaw: keep Rapier rotation in sync with ECS.
          const q = eulerToQuat(transform.rotation);
          existing.body.setRotation(q, true);
        }
        continue;
      }

      if (existing) {
        if (existing.collider) this.colliderEntities.delete(existing.collider.handle);
        this.world.removeRigidBody(existing.body);
        this.bodies.delete(entity.id);
      }

      const body = this.createBody(rigidbody, transform);
      const col = collider ? this.createCollider(collider, body) : null;
      this.bodies.set(entity.id, { body, collider: col, signature });
      if (col) this.colliderEntities.set(col.handle, entity.id);
    }

    for (const [id, entry] of this.bodies) {
      if (!alive.has(id)) {
        if (entry.collider) this.colliderEntities.delete(entry.collider.handle);
        this.world.removeRigidBody(entry.body);
        this.bodies.delete(id);
      }
    }
  }

  step(ecs: World, fixedDt: number): void {
    this.world.timestep = fixedDt;
    this.syncFromWorld(ecs);
    this.world.step(this.eventQueue);
    this.eventQueue.drainCollisionEvents((handleA, handleB, started) => {
      const entityA = this.colliderEntities.get(handleA);
      const entityB = this.colliderEntities.get(handleB);
      if (entityA && entityB) this.collisionEvents.push({ entityA, entityB, started });
    });
    this.writeTransforms(ecs);
  }

  applyImpulse(entityId: string, impulse: [number, number, number]): void {
    const entry = this.bodies.get(entityId);
    if (!entry) return;
    entry.body.applyImpulse({ x: impulse[0], y: impulse[1], z: impulse[2] }, true);
  }

  setLinearVelocity(entityId: string, velocity: [number, number, number]): void {
    const entry = this.bodies.get(entityId);
    if (!entry) return;
    entry.body.setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
  }

  getLinearVelocity(entityId: string): [number, number, number] | null {
    const velocity = this.bodies.get(entityId)?.body.linvel();
    return velocity ? [velocity.x, velocity.y, velocity.z] : null;
  }

  applyForce(entityId: string, force: [number, number, number]): void {
    this.bodies.get(entityId)?.body.addForce({ x: force[0], y: force[1], z: force[2] }, true);
  }

  applyTorque(entityId: string, torque: [number, number, number]): void {
    this.bodies.get(entityId)?.body.addTorque({ x: torque[0], y: torque[1], z: torque[2] }, true);
  }

  teleport(entityId: string, position: [number, number, number]): void {
    this.bodies
      .get(entityId)
      ?.body.setTranslation({ x: position[0], y: position[1], z: position[2] }, true);
  }

  raycast(
    origin: [number, number, number],
    direction: [number, number, number],
    maxDistance: number,
    excludeEntity?: string
  ): RaycastHit | null {
    const length = Math.hypot(direction[0], direction[1], direction[2]);
    if (length === 0) return null;
    const dir = {
      x: direction[0] / length,
      y: direction[1] / length,
      z: direction[2] / length,
    };
    const ray = new RAPIER.Ray({ x: origin[0], y: origin[1], z: origin[2] }, dir);
    const hit = this.world.castRayAndGetNormal(
      ray,
      maxDistance,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      excludeEntity
        ? (collider) => this.colliderEntities.get(collider.handle) !== excludeEntity
        : undefined
    );
    if (!hit) return null;
    const entityId = this.colliderEntities.get(hit.collider.handle);
    if (!entityId) return null;
    const point = ray.pointAt(hit.timeOfImpact);
    return {
      entityId,
      distance: hit.timeOfImpact,
      point: [point.x, point.y, point.z],
      normal: [hit.normal.x, hit.normal.y, hit.normal.z],
    };
  }

  drainCollisionEvents(): PhysicsCollisionEvent[] {
    return this.collisionEvents.splice(0);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const entry of this.bodies.values()) {
      this.world.removeRigidBody(entry.body);
    }
    this.bodies.clear();
    this.colliderEntities.clear();
    this.collisionEvents.length = 0;
    this.eventQueue.free();
    this.world.free();
  }

  private createBody(rigidbody: Rigidbody, transform: Transform): RAPIER.RigidBody {
    const desc =
      rigidbody.type === "static"
        ? RAPIER.RigidBodyDesc.fixed()
        : rigidbody.type === "kinematic"
          ? RAPIER.RigidBodyDesc.kinematicPositionBased()
          : RAPIER.RigidBodyDesc.dynamic();

    desc
      .setTranslation(transform.position[0], transform.position[1], transform.position[2])
      .setLinvel(rigidbody.velocity[0], rigidbody.velocity[1], rigidbody.velocity[2])
      .setLinearDamping(rigidbody.linearDamping)
      .setAngularDamping(rigidbody.angularDamping)
      .setGravityScale(rigidbody.gravityScale);

    if (rigidbody.type === "dynamic" && rigidbody.mass > 0) {
      desc.setAdditionalMass(rigidbody.mass);
    }

    if (rigidbody.lockRotation) {
      desc.lockRotations();
    }

    return this.world.createRigidBody(desc);
  }

  private createCollider(collider: Collider, body: RAPIER.RigidBody): RAPIER.Collider {
    const [sx, sy, sz] = collider.size;
    let desc: RAPIER.ColliderDesc;
    if (collider.shape === "sphere") {
      desc = RAPIER.ColliderDesc.ball(Math.max(sx, 0.01));
    } else if (collider.shape === "capsule") {
      desc = RAPIER.ColliderDesc.capsule(Math.max(sy, 0.01), Math.max(sx, 0.01));
    } else {
      desc = RAPIER.ColliderDesc.cuboid(Math.max(sx, 0.01), Math.max(sy, 0.01), Math.max(sz, 0.01));
    }

    desc
      .setTranslation(collider.offset[0], collider.offset[1], collider.offset[2])
      .setFriction(collider.friction)
      .setRestitution(collider.restitution)
      .setSensor(collider.isTrigger)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    return this.world.createCollider(desc, body);
  }

  private writeTransforms(ecs: World): void {
    for (const [id, entry] of this.bodies) {
      const transform = ecs.getComponent<Transform>(id, TRANSFORM);
      const rigidbody = ecs.getComponent<Rigidbody>(id, RIGIDBODY);
      if (!transform || !rigidbody) continue;
      if (rigidbody.type === "static" || rigidbody.type === "kinematic") continue;

      const t = entry.body.translation();
      const vel = entry.body.linvel();

      // When rotation is locked, scripts own yaw — don't overwrite from Rapier quat.
      let nextRotation = transform.rotation;
      if (!rigidbody.lockRotation) {
        const rot = entry.body.rotation();
        // Engine euler is [pitch, yaw, roll] (see TransformHandle.lookAt).
        nextRotation = quatToEuler(rot.x, rot.y, rot.z, rot.w);
      }

      ecs.setComponent(id, TRANSFORM, {
        ...transform,
        position: [t.x, t.y, t.z] as [number, number, number],
        rotation: nextRotation,
      });
      ecs.setComponent(id, RIGIDBODY, {
        ...rigidbody,
        velocity: [vel.x, vel.y, vel.z] as [number, number, number],
      });
    }
  }
}

function bodySignature(
  rigidbody: Rigidbody,
  collider: Collider | undefined,
  transform: Transform
): string {
  return JSON.stringify({
    type: rigidbody.type,
    mass: rigidbody.mass,
    damp: [rigidbody.linearDamping, rigidbody.angularDamping],
    g: rigidbody.gravityScale,
    lock: rigidbody.lockRotation,
    col: collider ?? null,
    // Include initial position only for static/kinematic rebuilds
    pos: rigidbody.type === "dynamic" ? null : transform.position,
  });
}

function quatToEuler(x: number, y: number, z: number, w: number): [number, number, number] {
  const sinr = 2 * (w * x + y * z);
  const cosr = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr, cosr);

  const sinp = 2 * (w * y - z * x);
  const pitch = Math.abs(sinp) >= 1 ? (Math.sign(sinp) * Math.PI) / 2 : Math.asin(sinp);

  const siny = 2 * (w * z + x * y);
  const cosy = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny, cosy);

  // Match engine convention: [pitch, yaw, roll]
  return [pitch, yaw, roll];
}

function eulerToQuat(euler: [number, number, number]): {
  x: number;
  y: number;
  z: number;
  w: number;
} {
  const [pitch, yaw, roll] = euler;
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);

  return {
    w: cr * cp * cy + sr * sp * sy,
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
  };
}
