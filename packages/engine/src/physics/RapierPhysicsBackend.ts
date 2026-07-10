import RAPIER from "@dimforge/rapier3d-compat";
import type {
  Collider,
  Rigidbody,
  Transform,
} from "@arcforge/schemas";
import type { World } from "../ecs/World.js";
import type { PhysicsBackend } from "./PhysicsBackend.js";

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
        }
        continue;
      }

      if (existing) {
        this.world.removeRigidBody(existing.body);
        this.bodies.delete(entity.id);
      }

      const body = this.createBody(rigidbody, transform);
      const col = collider
        ? this.createCollider(collider, body)
        : null;
      this.bodies.set(entity.id, { body, collider: col, signature });
    }

    for (const [id, entry] of this.bodies) {
      if (!alive.has(id)) {
        this.world.removeRigidBody(entry.body);
        this.bodies.delete(id);
      }
    }
  }

  step(ecs: World, fixedDt: number): void {
    this.world.timestep = fixedDt;
    this.syncFromWorld(ecs);
    this.world.step();
    this.writeTransforms(ecs);
  }

  applyImpulse(entityId: string, impulse: [number, number, number]): void {
    const entry = this.bodies.get(entityId);
    if (!entry) return;
    entry.body.applyImpulse({ x: impulse[0], y: impulse[1], z: impulse[2] }, true);
  }

  setLinearVelocity(
    entityId: string,
    velocity: [number, number, number]
  ): void {
    const entry = this.bodies.get(entityId);
    if (!entry) return;
    entry.body.setLinvel(
      { x: velocity[0], y: velocity[1], z: velocity[2] },
      true
    );
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const entry of this.bodies.values()) {
      this.world.removeRigidBody(entry.body);
    }
    this.bodies.clear();
    this.world.free();
  }

  private createBody(
    rigidbody: Rigidbody,
    transform: Transform
  ): RAPIER.RigidBody {
    const desc =
      rigidbody.type === "static"
        ? RAPIER.RigidBodyDesc.fixed()
        : rigidbody.type === "kinematic"
          ? RAPIER.RigidBodyDesc.kinematicPositionBased()
          : RAPIER.RigidBodyDesc.dynamic();

    desc
      .setTranslation(
        transform.position[0],
        transform.position[1],
        transform.position[2]
      )
      .setLinvel(
        rigidbody.velocity[0],
        rigidbody.velocity[1],
        rigidbody.velocity[2]
      )
      .setLinearDamping(rigidbody.linearDamping)
      .setAngularDamping(rigidbody.angularDamping)
      .setGravityScale(rigidbody.gravityScale);

    if (rigidbody.lockRotation) {
      desc.lockRotations();
    }

    return this.world.createRigidBody(desc);
  }

  private createCollider(
    collider: Collider,
    body: RAPIER.RigidBody
  ): RAPIER.Collider {
    const [sx, sy, sz] = collider.size;
    let desc: RAPIER.ColliderDesc;
    if (collider.shape === "sphere") {
      desc = RAPIER.ColliderDesc.ball(Math.max(sx, 0.01));
    } else if (collider.shape === "capsule") {
      desc = RAPIER.ColliderDesc.capsule(
        Math.max(sy, 0.01),
        Math.max(sx, 0.01)
      );
    } else {
      desc = RAPIER.ColliderDesc.cuboid(
        Math.max(sx, 0.01),
        Math.max(sy, 0.01),
        Math.max(sz, 0.01)
      );
    }

    desc
      .setTranslation(collider.offset[0], collider.offset[1], collider.offset[2])
      .setFriction(collider.friction)
      .setRestitution(collider.restitution)
      .setSensor(collider.isTrigger);

    return this.world.createCollider(desc, body);
  }

  private writeTransforms(ecs: World): void {
    for (const [id, entry] of this.bodies) {
      const transform = ecs.getComponent<Transform>(id, TRANSFORM);
      const rigidbody = ecs.getComponent<Rigidbody>(id, RIGIDBODY);
      if (!transform || !rigidbody) continue;
      if (rigidbody.type === "static" || rigidbody.type === "kinematic") continue;

      const t = entry.body.translation();
      const rot = entry.body.rotation();
      const euler = quatToEuler(rot.x, rot.y, rot.z, rot.w);
      const vel = entry.body.linvel();

      ecs.setComponent(id, TRANSFORM, {
        ...transform,
        position: [t.x, t.y, t.z] as [number, number, number],
        rotation: euler,
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
    pos:
      rigidbody.type === "dynamic"
        ? null
        : transform.position,
  });
}

function quatToEuler(
  x: number,
  y: number,
  z: number,
  w: number
): [number, number, number] {
  const sinr = 2 * (w * x + y * z);
  const cosr = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr, cosr);

  const sinp = 2 * (w * y - z * x);
  const pitch =
    Math.abs(sinp) >= 1 ? (Math.sign(sinp) * Math.PI) / 2 : Math.asin(sinp);

  const siny = 2 * (w * z + x * y);
  const cosy = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny, cosy);

  return [roll, pitch, yaw];
}
