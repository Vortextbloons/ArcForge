import type { EntityId, EntityRecord } from "./types.js";

/**
 * ECS world: entities are IDs, components are data bags keyed by type id.
 * Systems query this world each frame.
 */
export class World {
  private readonly entities = new Map<EntityId, EntityRecord>();

  has(id: EntityId): boolean {
    return this.entities.has(id);
  }

  get(id: EntityId): EntityRecord | undefined {
    return this.entities.get(id);
  }

  create(
    id: EntityId,
    name: string,
    parent: EntityId | null = null
  ): EntityRecord {
    if (this.entities.has(id)) {
      throw new Error(`Entity already exists: ${id}`);
    }
    const entity: EntityRecord = {
      id,
      name,
      parent,
      components: new Map(),
    };
    this.entities.set(id, entity);
    return entity;
  }

  destroy(id: EntityId): boolean {
    // Also destroy children that reference this parent.
    for (const entity of this.entities.values()) {
      if (entity.parent === id) {
        this.destroy(entity.id);
      }
    }
    return this.entities.delete(id);
  }

  clear(): void {
    this.entities.clear();
  }

  addComponent(id: EntityId, typeId: string, data: unknown): void {
    const entity = this.require(id);
    entity.components.set(typeId, data);
  }

  removeComponent(id: EntityId, typeId: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;
    return entity.components.delete(typeId);
  }

  getComponent<T>(id: EntityId, typeId: string): T | undefined {
    return this.entities.get(id)?.components.get(typeId) as T | undefined;
  }

  setComponent(id: EntityId, typeId: string, data: unknown): void {
    this.addComponent(id, typeId, data);
  }

  /** Entities that have all listed component type ids. */
  query(...typeIds: string[]): EntityRecord[] {
    const result: EntityRecord[] = [];
    for (const entity of this.entities.values()) {
      if (typeIds.every((t) => entity.components.has(t))) {
        result.push(entity);
      }
    }
    return result;
  }

  all(): EntityRecord[] {
    return [...this.entities.values()];
  }

  childrenOf(parentId: EntityId | null): EntityRecord[] {
    return this.all().filter((e) => e.parent === parentId);
  }

  private require(id: EntityId): EntityRecord {
    const entity = this.entities.get(id);
    if (!entity) {
      throw new Error(`Entity not found: ${id}`);
    }
    return entity;
  }
}
