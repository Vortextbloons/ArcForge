import type { Entity, Scene } from "@threeforge/schemas";
import type { EditorCommand } from "../undo/CommandHistory.js";
import type { EditorContext } from "../types.js";

export function createEntityId(prefix = "entity"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function cloneScene(scene: Scene): Scene {
  return structuredClone(scene);
}

function replaceEntity(scene: Scene, entity: Entity): Scene {
  const next = cloneScene(scene);
  const index = next.entities.findIndex((e) => e.id === entity.id);
  if (index === -1) {
    throw new Error(`Entity not found: ${entity.id}`);
  }
  next.entities[index] = structuredClone(entity);
  return next;
}

export class CreateEntityCommand implements EditorCommand {
  readonly id = "scene.create_entity";
  readonly label: string;
  private readonly entity: Entity;

  constructor(input?: Partial<Entity> & { name?: string }) {
    const id = input?.id ?? createEntityId();
    this.entity = {
      id,
      name: input?.name ?? "Entity",
      parent: input?.parent ?? null,
      components: input?.components ?? {
        "core.transform": {
          position: [0, 0.5, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      },
      prefab: input?.prefab,
      overrides: input?.overrides,
    };
    this.label = `Create ${this.entity.name}`;
  }

  execute(ctx: EditorContext): void {
    const scene = cloneScene(ctx.getScene());
    if (scene.entities.some((e) => e.id === this.entity.id)) {
      throw new Error(`Entity already exists: ${this.entity.id}`);
    }
    scene.entities.push(structuredClone(this.entity));
    ctx.setScene(scene);
    ctx.setSelection([this.entity.id]);
    ctx.notify({ type: "entity.created", entity: structuredClone(this.entity) });
  }

  undo(ctx: EditorContext): void {
    const scene = cloneScene(ctx.getScene());
    scene.entities = scene.entities.filter((e) => e.id !== this.entity.id);
    ctx.setScene(scene);
    ctx.setSelection(ctx.getSelection().filter((id) => id !== this.entity.id));
    ctx.notify({ type: "entity.deleted", entityId: this.entity.id });
  }
}

export class DeleteEntityCommand implements EditorCommand {
  readonly id = "scene.delete_entity";
  readonly label: string;
  private removed: Entity[] = [];
  private previousSelection: string[] = [];

  constructor(private readonly entityId: string) {
    this.label = `Delete ${entityId}`;
  }

  execute(ctx: EditorContext): void {
    const scene = cloneScene(ctx.getScene());
    const root = scene.entities.find((e) => e.id === this.entityId);
    if (!root) {
      throw new Error(`Entity not found: ${this.entityId}`);
    }

    const toRemove = collectDescendants(scene, this.entityId);
    this.removed = scene.entities.filter((e) => toRemove.has(e.id));
    this.previousSelection = [...ctx.getSelection()];

    scene.entities = scene.entities.filter((e) => !toRemove.has(e.id));
    ctx.setScene(scene);
    ctx.setSelection(
      ctx.getSelection().filter((id) => !toRemove.has(id))
    );
    for (const entity of this.removed) {
      ctx.notify({ type: "entity.deleted", entityId: entity.id });
    }
  }

  undo(ctx: EditorContext): void {
    const scene = cloneScene(ctx.getScene());
    scene.entities.push(...this.removed.map((e) => structuredClone(e)));
    ctx.setScene(scene);
    ctx.setSelection(this.previousSelection);
    for (const entity of this.removed) {
      ctx.notify({ type: "entity.created", entity: structuredClone(entity) });
    }
  }
}

export class RenameEntityCommand implements EditorCommand {
  readonly id = "scene.rename_entity";
  readonly label: string;
  private previousName = "";

  constructor(
    private readonly entityId: string,
    private readonly nextName: string
  ) {
    this.label = `Rename to ${nextName}`;
  }

  execute(ctx: EditorContext): void {
    const entity = ctx.findEntity(this.entityId);
    if (!entity) throw new Error(`Entity not found: ${this.entityId}`);
    this.previousName = entity.name;
    const updated = { ...structuredClone(entity), name: this.nextName };
    ctx.setScene(replaceEntity(ctx.getScene(), updated));
    ctx.notify({ type: "entity.updated", entity: updated });
  }

  undo(ctx: EditorContext): void {
    const entity = ctx.findEntity(this.entityId);
    if (!entity) return;
    const updated = { ...structuredClone(entity), name: this.previousName };
    ctx.setScene(replaceEntity(ctx.getScene(), updated));
    ctx.notify({ type: "entity.updated", entity: updated });
  }
}

export class ReparentEntityCommand implements EditorCommand {
  readonly id = "scene.reparent_entity";
  readonly label: string;
  private previousParent: string | null = null;

  constructor(
    private readonly entityId: string,
    private readonly nextParent: string | null
  ) {
    this.label = `Reparent ${entityId}`;
  }

  execute(ctx: EditorContext): void {
    const entity = ctx.findEntity(this.entityId);
    if (!entity) throw new Error(`Entity not found: ${this.entityId}`);
    if (this.nextParent === this.entityId) {
      throw new Error("Entity cannot parent itself");
    }
    if (this.nextParent && !ctx.findEntity(this.nextParent)) {
      throw new Error(`Parent not found: ${this.nextParent}`);
    }
    this.previousParent = entity.parent ?? null;
    const updated = {
      ...structuredClone(entity),
      parent: this.nextParent,
    };
    ctx.setScene(replaceEntity(ctx.getScene(), updated));
    ctx.notify({ type: "entity.updated", entity: updated });
  }

  undo(ctx: EditorContext): void {
    const entity = ctx.findEntity(this.entityId);
    if (!entity) return;
    const updated = {
      ...structuredClone(entity),
      parent: this.previousParent,
    };
    ctx.setScene(replaceEntity(ctx.getScene(), updated));
    ctx.notify({ type: "entity.updated", entity: updated });
  }
}

export class AddComponentCommand implements EditorCommand {
  readonly id = "scene.add_component";
  readonly label: string;

  constructor(
    private readonly entityId: string,
    private readonly componentId: string,
    private readonly data: unknown
  ) {
    this.label = `Add ${componentId}`;
  }

  execute(ctx: EditorContext): void {
    const entity = ctx.findEntity(this.entityId);
    if (!entity) throw new Error(`Entity not found: ${this.entityId}`);
    if (entity.components[this.componentId] !== undefined) {
      throw new Error(`Component already exists: ${this.componentId}`);
    }
    const updated = structuredClone(entity);
    updated.components[this.componentId] = structuredClone(this.data);
    ctx.setScene(replaceEntity(ctx.getScene(), updated));
    ctx.notify({ type: "entity.updated", entity: updated });
  }

  undo(ctx: EditorContext): void {
    const entity = ctx.findEntity(this.entityId);
    if (!entity) return;
    const updated = structuredClone(entity);
    delete updated.components[this.componentId];
    ctx.setScene(replaceEntity(ctx.getScene(), updated));
    ctx.notify({ type: "entity.updated", entity: updated });
  }
}

export class RemoveComponentCommand implements EditorCommand {
  readonly id = "scene.remove_component";
  readonly label: string;
  private previous: unknown;

  constructor(
    private readonly entityId: string,
    private readonly componentId: string
  ) {
    this.label = `Remove ${componentId}`;
  }

  execute(ctx: EditorContext): void {
    const entity = ctx.findEntity(this.entityId);
    if (!entity) throw new Error(`Entity not found: ${this.entityId}`);
    if (entity.components[this.componentId] === undefined) {
      throw new Error(`Component not found: ${this.componentId}`);
    }
    this.previous = structuredClone(entity.components[this.componentId]);
    const updated = structuredClone(entity);
    delete updated.components[this.componentId];
    ctx.setScene(replaceEntity(ctx.getScene(), updated));
    ctx.notify({ type: "entity.updated", entity: updated });
  }

  undo(ctx: EditorContext): void {
    const entity = ctx.findEntity(this.entityId);
    if (!entity) return;
    const updated = structuredClone(entity);
    updated.components[this.componentId] = structuredClone(this.previous);
    ctx.setScene(replaceEntity(ctx.getScene(), updated));
    ctx.notify({ type: "entity.updated", entity: updated });
  }
}

export class UpdateComponentCommand implements EditorCommand {
  readonly id = "scene.update_component";
  readonly label: string;
  private previous: unknown;

  constructor(
    private readonly entityId: string,
    private readonly componentId: string,
    private readonly nextData: unknown
  ) {
    this.label = `Update ${componentId}`;
  }

  execute(ctx: EditorContext): void {
    const entity = ctx.findEntity(this.entityId);
    if (!entity) throw new Error(`Entity not found: ${this.entityId}`);
    if (entity.components[this.componentId] === undefined) {
      throw new Error(`Component not found: ${this.componentId}`);
    }
    this.previous = structuredClone(entity.components[this.componentId]);
    const updated = structuredClone(entity);
    updated.components[this.componentId] = structuredClone(this.nextData);
    ctx.setScene(replaceEntity(ctx.getScene(), updated));
    ctx.notify({ type: "entity.updated", entity: updated });
  }

  undo(ctx: EditorContext): void {
    const entity = ctx.findEntity(this.entityId);
    if (!entity) return;
    const updated = structuredClone(entity);
    updated.components[this.componentId] = structuredClone(this.previous);
    ctx.setScene(replaceEntity(ctx.getScene(), updated));
    ctx.notify({ type: "entity.updated", entity: updated });
  }
}

function collectDescendants(scene: Scene, rootId: string): Set<string> {
  const ids = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const entity of scene.entities) {
      if (
        entity.parent &&
        ids.has(entity.parent) &&
        !ids.has(entity.id)
      ) {
        ids.add(entity.id);
        changed = true;
      }
    }
  }
  return ids;
}
