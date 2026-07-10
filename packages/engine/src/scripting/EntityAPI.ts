import type { ComponentRegistry } from "../ecs/ComponentRegistry.js";
import type { World } from "../ecs/World.js";
import { EntityHandle } from "./EntityHandle.js";
import type { PrefabRegistry } from "../runtime/PrefabRegistry.js";

export interface SpawnEntityOptions {
  id?: string;
  name?: string;
  parent?: string | null;
  components?: Record<string, unknown>;
  overrides?: Record<string, unknown>;
}

/** Public, validated entity lifecycle API for gameplay scripts. */
export class EntityAPI {
  private nextId = 1;

  constructor(
    private readonly world: World,
    private readonly registry: ComponentRegistry,
    private readonly prefabs?: PrefabRegistry
  ) {}

  get(id: string): EntityHandle | undefined {
    return this.world.has(id) ? new EntityHandle(id, this.world) : undefined;
  }

  require(id: string): EntityHandle {
    const entity = this.get(id);
    if (!entity) throw new Error(`Entity not found: ${id}`);
    return entity;
  }

  findByName(name: string): EntityHandle | undefined {
    const record = this.world.all().find((entity) => entity.name === name);
    return record ? new EntityHandle(record.id, this.world) : undefined;
  }

  query(...components: string[]): EntityHandle[] {
    return this.world.query(...components).map((entity) => new EntityHandle(entity.id, this.world));
  }

  all(): EntityHandle[] {
    return this.world.all().map((entity) => new EntityHandle(entity.id, this.world));
  }

  spawn(options: SpawnEntityOptions = {}): EntityHandle {
    const id = options.id ?? this.createId(options.name ?? "entity");
    this.world.create(id, options.name ?? "Entity", options.parent ?? null);
    try {
      for (const [component, raw] of Object.entries(options.components ?? {})) {
        this.world.addComponent(id, component, this.registry.parse(component, raw));
      }
    } catch (error) {
      this.world.destroy(id);
      throw error;
    }
    return new EntityHandle(id, this.world);
  }

  spawnPrefab(path: string, options: SpawnEntityOptions = {}): EntityHandle {
    if (!this.prefabs) throw new Error("Runtime prefab registry is not available");
    const id = options.id ?? this.createId(options.name ?? "prefab");
    const instance = this.prefabs.instantiate(path, {
      id,
      name: options.name,
      parent: options.parent,
      components: options.components,
      overrides: options.overrides,
    });
    const created: string[] = [];
    try {
      for (const entity of instance) {
        this.world.create(entity.id, entity.name, entity.parent ?? null);
        created.push(entity.id);
        for (const [component, raw] of Object.entries(entity.components)) {
          this.world.addComponent(entity.id, component, this.registry.parse(component, raw));
        }
      }
    } catch (error) {
      for (const entityId of created.reverse()) this.world.destroy(entityId);
      throw error;
    }
    return this.require(id);
  }

  destroy(entity: string | EntityHandle): boolean {
    return this.world.destroy(typeof entity === "string" ? entity : entity.id);
  }

  addComponent<T>(entityId: string, component: string, data: unknown = {}): T {
    if (this.world.getComponent(entityId, component) !== undefined) {
      throw new Error(`Component already exists: ${component}`);
    }
    const parsed = this.registry.parse(component, data) as T;
    this.world.addComponent(entityId, component, parsed);
    return parsed;
  }

  setComponent<T>(entityId: string, component: string, data: unknown): T {
    const parsed = this.registry.parse(component, data) as T;
    this.world.setComponent(entityId, component, parsed);
    return parsed;
  }

  removeComponent(entityId: string, component: string): boolean {
    return this.world.removeComponent(entityId, component);
  }

  rename(entityId: string, name: string): void {
    this.world.rename(entityId, name);
  }

  setParent(entityId: string, parent: string | null): void {
    this.world.setParent(entityId, parent);
  }

  private createId(name: string): string {
    const prefix =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "entity";
    let id: string;
    do {
      id = `${prefix}_${this.nextId++}`;
    } while (this.world.has(id));
    return id;
  }
}
