import type { Transform } from "@threeforge/schemas";
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

  get position(): [number, number, number] {
    return [...this.require().position] as [number, number, number];
  }

  set position(value: [number, number, number]) {
    const t = this.require();
    t.position = [value[0], value[1], value[2]];
    this.world.setComponent(this.entityId, TRANSFORM_ID, t);
  }

  get rotation(): [number, number, number] {
    return [...this.require().rotation] as [number, number, number];
  }

  set rotation(value: [number, number, number]) {
    const t = this.require();
    t.rotation = [value[0], value[1], value[2]];
    this.world.setComponent(this.entityId, TRANSFORM_ID, t);
  }

  get scale(): [number, number, number] {
    return [...this.require().scale] as [number, number, number];
  }

  set scale(value: [number, number, number]) {
    const t = this.require();
    t.scale = [value[0], value[1], value[2]];
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
}
