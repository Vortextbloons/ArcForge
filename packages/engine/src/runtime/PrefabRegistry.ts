import {
  parsePrefab,
  type Entity,
  type Prefab,
  type PrefabNode,
  type Scene,
} from "@arcforge/schemas";

export interface PrefabInstanceOptions {
  id: string;
  name?: string;
  parent?: string | null;
  components?: Record<string, unknown>;
  overrides?: Record<string, unknown>;
}

/** Runtime prefab library shared by scene loading and gameplay spawning. */
export class PrefabRegistry {
  private readonly prefabs = new Map<string, Prefab>();

  register(path: string, data: unknown): Prefab {
    const prefab = parsePrefab(data);
    this.prefabs.set(normalizePrefabPath(path), prefab);
    return prefab;
  }

  registerMany(entries: Record<string, unknown>): void {
    for (const [path, data] of Object.entries(entries)) this.register(path, data);
  }

  get(path: string): Prefab | undefined {
    return this.prefabs.get(normalizePrefabPath(path));
  }

  has(path: string): boolean {
    return this.prefabs.has(normalizePrefabPath(path));
  }

  list(): string[] {
    return [...this.prefabs.keys()];
  }

  clear(): void {
    this.prefabs.clear();
  }

  instantiate(path: string, options: PrefabInstanceOptions): Entity[] {
    const prefab = this.get(path);
    if (!prefab) throw new Error(`Prefab not registered: ${path}`);
    const output: Entity[] = [];
    this.appendRegisteredNode(
      prefab.root,
      options.id,
      options.parent ?? null,
      options.id,
      output,
      new Set([normalizePrefabPath(path)])
    );
    const root = output[0]!;
    root.name = options.name ?? prefab.name ?? root.name;
    root.components = {
      ...root.components,
      ...structuredClone(options.components ?? {}),
    };
    root.components = applyComponentOverrides(root.components, options.overrides ?? {});
    return output;
  }

  private appendRegisteredNode(
    node: PrefabNode,
    entityId: string,
    parent: string | null,
    instanceRoot: string,
    output: Entity[],
    stack: Set<string>
  ): void {
    if (node.prefab) {
      const path = normalizePrefabPath(node.prefab);
      if (stack.has(path))
        throw new Error(`Nested prefab cycle detected: ${[...stack, path].join(" -> ")}`);
      const nested = this.get(path);
      if (!nested) throw new Error(`Nested prefab not registered: ${path}`);
      const start = output.length;
      const nextStack = new Set(stack).add(path);
      this.appendRegisteredNode(nested.root, entityId, parent, instanceRoot, output, nextStack);
      const root = output[start]!;
      root.name = node.name || nested.name;
      root.components = { ...root.components, ...structuredClone(node.components) };
      root.components = applyComponentOverrides(root.components, node.overrides ?? {});
    } else {
      output.push({
        id: entityId,
        name: node.name,
        parent,
        components: structuredClone(node.components),
      });
    }
    for (const child of node.children) {
      const childId = `${instanceRoot}/${sanitizeId(child.id)}`;
      this.appendRegisteredNode(child, childId, entityId, childId, output, stack);
    }
  }
}

export function resolveScenePrefabs(scene: Scene, prefabs: PrefabRegistry): Scene {
  const entities: Entity[] = [];
  for (const entity of scene.entities) {
    if (!entity.prefab) {
      entities.push(structuredClone(entity));
      continue;
    }
    entities.push(
      ...prefabs.instantiate(entity.prefab, {
        id: entity.id,
        name: entity.name,
        parent: entity.parent,
        components: entity.components,
        overrides: entity.overrides,
      })
    );
  }
  return { ...scene, entities };
}

export function instantiatePrefab(prefab: Prefab, options: PrefabInstanceOptions): Entity[] {
  const output: Entity[] = [];
  appendNode(prefab.root, options.id, options.parent ?? null, options.id, output, true);

  const root = output[0]!;
  root.name = options.name ?? prefab.name ?? root.name;
  root.components = {
    ...root.components,
    ...structuredClone(options.components ?? {}),
  };
  root.components = applyComponentOverrides(root.components, options.overrides ?? {});
  return output;
}

function appendNode(
  node: PrefabNode,
  entityId: string,
  parent: string | null,
  instanceRoot: string,
  output: Entity[],
  root: boolean
): void {
  if (node.prefab) {
    throw new Error("Nested prefabs require a PrefabRegistry instance");
  }
  output.push({
    id: entityId,
    name: node.name,
    parent,
    components: structuredClone(node.components),
    ...(root ? {} : { prefab: undefined }),
  });
  for (const child of node.children) {
    const childId = `${instanceRoot}/${sanitizeId(child.id)}`;
    appendNode(child, childId, entityId, childId, output, false);
  }
}

function applyComponentOverrides(
  source: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const result = structuredClone(source);
  for (const [path, value] of Object.entries(overrides)) {
    const component = Object.keys(result)
      .filter((id) => path === id || path.startsWith(`${id}.`))
      .sort((a, b) => b.length - a.length)[0];
    if (!component) {
      throw new Error(`Prefab override references an unknown component: ${path}`);
    }
    if (path === component) {
      result[component] = structuredClone(value);
      continue;
    }
    const keys = path.slice(component.length + 1).split(".");
    const componentData = result[component];
    if (!componentData || typeof componentData !== "object" || Array.isArray(componentData)) {
      throw new Error(`Prefab override cannot patch non-object component: ${component}`);
    }
    setNested(componentData as Record<string, unknown>, keys, structuredClone(value));
  }
  return result;
}

function setNested(target: Record<string, unknown>, keys: string[], value: unknown): void {
  let cursor = target;
  for (const key of keys.slice(0, -1)) {
    const existing = cursor[key];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys.at(-1)!] = value;
}

function normalizePrefabPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function sanitizeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]+/g, "_") || "entity";
}
