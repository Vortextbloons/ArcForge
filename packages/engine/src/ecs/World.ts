import type { EntityId, EntityRecord } from "./types.js";

export type WorldEvent =
  | { type: "entity.created"; entity: EntityRecord }
  | { type: "entity.destroyed"; entity: EntityRecord }
  | { type: "entity.renamed"; entityId: EntityId; name: string }
  | { type: "entity.reparented"; entityId: EntityId; parent: EntityId | null }
  | {
      type: "component.added" | "component.updated";
      entityId: EntityId;
      component: string;
      data: unknown;
    }
  | { type: "component.removed"; entityId: EntityId; component: string }
  | { type: "world.cleared" };

export type WorldListener = (event: WorldEvent) => void;

/**
 * ECS world: entities are IDs, components are data bags keyed by type id.
 * Systems query this world each frame.
 */
export class World {
  private readonly entities = new Map<EntityId, EntityRecord>();
  private readonly listeners = new Set<WorldListener>();

  subscribe(listener: WorldListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  has(id: EntityId): boolean {
    return this.entities.has(id);
  }

  get(id: EntityId): EntityRecord | undefined {
    return this.entities.get(id);
  }

  create(id: EntityId, name: string, parent: EntityId | null = null): EntityRecord {
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
    this.emit({ type: "entity.created", entity });
    return entity;
  }

  destroy(id: EntityId): boolean {
    // Also destroy children that reference this parent.
    for (const entity of this.entities.values()) {
      if (entity.parent === id) {
        this.destroy(entity.id);
      }
    }
    const entity = this.entities.get(id);
    if (!entity) return false;
    this.entities.delete(id);
    this.emit({ type: "entity.destroyed", entity });
    return true;
  }

  clear(): void {
    if (this.entities.size === 0) return;
    this.entities.clear();
    this.emit({ type: "world.cleared" });
  }

  rename(id: EntityId, name: string): void {
    const entity = this.require(id);
    entity.name = name;
    this.emit({ type: "entity.renamed", entityId: id, name });
  }

  setParent(id: EntityId, parent: EntityId | null): void {
    const entity = this.require(id);
    if (parent === id) throw new Error("Entity cannot parent itself");
    if (parent !== null && !this.entities.has(parent)) {
      throw new Error(`Parent not found: ${parent}`);
    }
    let ancestor = parent;
    while (ancestor !== null) {
      if (ancestor === id) throw new Error("Entity parent would create a cycle");
      ancestor = this.entities.get(ancestor)?.parent ?? null;
    }
    entity.parent = parent;
    this.emit({ type: "entity.reparented", entityId: id, parent });
  }

  addComponent(id: EntityId, typeId: string, data: unknown): void {
    const entity = this.require(id);
    const existed = entity.components.has(typeId);
    entity.components.set(typeId, data);
    this.emit({
      type: existed ? "component.updated" : "component.added",
      entityId: id,
      component: typeId,
      data,
    });
  }

  removeComponent(id: EntityId, typeId: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;
    const removed = entity.components.delete(typeId);
    if (removed) {
      this.emit({ type: "component.removed", entityId: id, component: typeId });
    }
    return removed;
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

  private emit(event: WorldEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
