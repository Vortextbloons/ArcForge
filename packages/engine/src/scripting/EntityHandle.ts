import type { Transform } from "@arcforge/schemas";
import type { EntityId, EntityRecord } from "../ecs/types.js";
import type { World } from "../ecs/World.js";

const TRANSFORM_ID = "core.transform";

/**
 * Script-facing wrapper around an entity record.
 * Mutating transform writes back into the ECS world.
 */
export class EntityHandle {
  constructor(
    readonly id: EntityId,
    private readonly world: World
  ) {}

  get name(): string {
    return this.world.get(this.id)?.name ?? this.id;
  }

  get parent(): EntityId | null {
    return this.world.get(this.id)?.parent ?? null;
  }

  get record(): EntityRecord | undefined {
    return this.world.get(this.id);
  }

  getComponent<T>(typeId: string): T | undefined {
    return this.world.getComponent<T>(this.id, typeId);
  }

  hasComponent(typeId: string): boolean {
    return this.world.get(this.id)?.components.has(typeId) ?? false;
  }

  get transform(): TransformHandle {
    return new TransformHandle(this.id, this.world);
  }
}

export class TransformHandle {
  constructor(
    private readonly entityId: EntityId,
    private readonly world: World
  ) {}

  private require(): Transform {
    const data = this.world.getComponent<Transform>(this.entityId, TRANSFORM_ID);
    if (!data) {
      throw new Error(`Entity ${this.entityId} has no core.transform`);
    }
    return data;
  }

  /**
   * Mutable xyz view over the stored tuple. Assigning `.x/.y/.z` writes back.
   * Also supports tuple assignment: `transform.position = [x, y, z]`.
   */
  get position(): Vec3View {
    return createVec3View(this.require().position, (next) => {
      const t = this.require();
      t.position = next;
      this.world.setComponent(this.entityId, TRANSFORM_ID, t);
    });
  }

  set position(value: [number, number, number] | Vec3Like) {
    const next = toTuple(value);
    const t = this.require();
    t.position = next;
    this.world.setComponent(this.entityId, TRANSFORM_ID, t);
  }

  get rotation(): Vec3View {
    return createVec3View(this.require().rotation, (next) => {
      const t = this.require();
      t.rotation = next;
      this.world.setComponent(this.entityId, TRANSFORM_ID, t);
    });
  }

  set rotation(value: [number, number, number] | Vec3Like) {
    const next = toTuple(value);
    const t = this.require();
    t.rotation = next;
    this.world.setComponent(this.entityId, TRANSFORM_ID, t);
  }

  get scale(): Vec3View {
    return createVec3View(this.require().scale, (next) => {
      const t = this.require();
      t.scale = next;
      this.world.setComponent(this.entityId, TRANSFORM_ID, t);
    });
  }

  set scale(value: [number, number, number] | Vec3Like) {
    const next = toTuple(value);
    const t = this.require();
    t.scale = next;
    this.world.setComponent(this.entityId, TRANSFORM_ID, t);
  }

  translate(x: number, y: number, z: number): void {
    const t = this.require();
    t.position = [t.position[0] + x, t.position[1] + y, t.position[2] + z];
    this.world.setComponent(this.entityId, TRANSFORM_ID, t);
  }

  setPosition(x: number, y: number, z: number): void {
    this.position = [x, y, z];
  }

  setRotation(x: number, y: number, z: number): void {
    this.rotation = [x, y, z];
  }

  /** Point this entity's forward (-Z) toward a world-space target (Y-up euler). */
  lookAt(x: number, y: number, z: number): void {
    const pos = this.require().position;
    const dx = x - pos[0];
    const dy = y - pos[1];
    const dz = z - pos[2];
    const yaw = Math.atan2(dx, dz);
    const pitch = -Math.atan2(dy, Math.hypot(dx, dz));
    this.rotation = [pitch, yaw, 0];
  }
}

export type Vec3Like = { x: number; y: number; z: number };
export type Vec3View = [number, number, number] & Vec3Like;

function toTuple(value: [number, number, number] | Vec3Like): [number, number, number] {
  if (Array.isArray(value)) {
    return [value[0], value[1], value[2]];
  }
  return [value.x, value.y, value.z];
}

function createVec3View(
  source: [number, number, number],
  write: (next: [number, number, number]) => void
): Vec3View {
  const view = [source[0], source[1], source[2]] as Vec3View;
  Object.defineProperties(view, {
    x: {
      get: () => view[0],
      set: (v: number) => {
        view[0] = v;
        write([view[0], view[1], view[2]]);
      },
      enumerable: true,
    },
    y: {
      get: () => view[1],
      set: (v: number) => {
        view[1] = v;
        write([view[0], view[1], view[2]]);
      },
      enumerable: true,
    },
    z: {
      get: () => view[2],
      set: (v: number) => {
        view[2] = v;
        write([view[0], view[1], view[2]]);
      },
      enumerable: true,
    },
  });
  return view;
}
