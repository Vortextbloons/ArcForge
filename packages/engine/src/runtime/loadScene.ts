import { parseScene, type Scene, type Entity as SceneEntity } from "@arcforge/schemas";
import { World } from "../ecs/World.js";
import { ComponentRegistry } from "../ecs/ComponentRegistry.js";

export interface LoadedScene {
  scene: Scene;
  world: World;
}

export interface LoadSceneOptions {
  /** Existing world to populate (cleared first). Defaults to a new World. */
  world?: World;
  registry?: ComponentRegistry;
}

/**
 * Load a scene JSON document into an ECS world, validating known components.
 */
export function loadScene(data: unknown, options: LoadSceneOptions = {}): LoadedScene {
  const registry = options.registry ?? ComponentRegistry.withCore();
  const scene = parseScene(data);
  const world = options.world ?? new World();
  world.clear();

  for (const entity of scene.entities) {
    createEntity(world, registry, entity);
  }

  validateHierarchy(world);

  return { scene, world };
}

function createEntity(world: World, registry: ComponentRegistry, entity: SceneEntity): void {
  world.create(entity.id, entity.name, entity.parent ?? null);

  for (const [typeId, raw] of Object.entries(entity.components ?? {})) {
    const parsed = registry.parse(typeId, raw);
    world.addComponent(entity.id, typeId, parsed);
  }
}

function validateHierarchy(world: World): void {
  for (const entity of world.all()) {
    if (entity.parent === null) continue;
    if (!world.has(entity.parent)) {
      throw new Error(`Entity "${entity.id}" references missing parent "${entity.parent}"`);
    }
    const seen = new Set<string>();
    let current: string | null = entity.id;
    while (current) {
      if (seen.has(current)) {
        throw new Error(`Parent cycle detected at entity "${current}"`);
      }
      seen.add(current);
      current = world.get(current)?.parent ?? null;
    }
  }
}

/** Serialize a world back to portable scene JSON. */
export function worldToScene(world: World, name: string, version = 1): Scene {
  return {
    version,
    name,
    entities: world.all().map((e) => ({
      id: e.id,
      name: e.name,
      parent: e.parent,
      components: Object.fromEntries(e.components.entries()),
    })),
  };
}
