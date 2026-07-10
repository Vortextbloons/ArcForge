import type { Entity, Scene } from "@arcforge/schemas";
import type { EditorCommand } from "../undo/CommandHistory.js";
import type { EditorContext } from "../types.js";
import { createEntityId } from "./entityCommands.js";

/** Duplicates an entity hierarchy with remapped ids and undo support. */
export class DuplicateEntityCommand implements EditorCommand {
  readonly id = "scene.duplicate_entity";
  readonly label: string;
  private created: Entity[] = [];
  private duplicatedRootId = "";

  constructor(
    private readonly sourceId: string,
    private readonly requestedRootId?: string
  ) {
    this.label = `Duplicate ${sourceId}`;
  }

  get rootId(): string {
    return this.duplicatedRootId;
  }

  execute(ctx: EditorContext): void {
    const scene = ctx.getScene();
    const source = scene.entities.find((entity) => entity.id === this.sourceId);
    if (!source) throw new Error(`Entity not found: ${this.sourceId}`);
    const hierarchy = collectHierarchy(scene, this.sourceId);
    const ids = new Map<string, string>();
    for (const entity of hierarchy) {
      const id =
        entity.id === this.sourceId && this.requestedRootId
          ? this.requestedRootId
          : createEntityId(entity.id);
      if (
        scene.entities.some((candidate) => candidate.id === id) ||
        [...ids.values()].includes(id)
      ) {
        throw new Error(`Entity already exists: ${id}`);
      }
      ids.set(entity.id, id);
    }
    this.duplicatedRootId = ids.get(this.sourceId)!;
    this.created = hierarchy.map((entity) => ({
      ...structuredClone(entity),
      id: ids.get(entity.id)!,
      name: entity.id === this.sourceId ? `${entity.name} Copy` : entity.name,
      parent: entity.parent && ids.has(entity.parent) ? ids.get(entity.parent)! : entity.parent,
    }));
    ctx.setScene({ ...structuredClone(scene), entities: [...scene.entities, ...this.created] });
    ctx.setSelection([this.duplicatedRootId]);
    for (const entity of this.created) ctx.notify({ type: "entity.created", entity });
  }

  undo(ctx: EditorContext): void {
    const ids = new Set(this.created.map((entity) => entity.id));
    ctx.setScene({
      ...structuredClone(ctx.getScene()),
      entities: ctx.getScene().entities.filter((entity) => !ids.has(entity.id)),
    });
    ctx.setSelection(ctx.getSelection().filter((id) => !ids.has(id)));
    for (const id of ids) ctx.notify({ type: "entity.deleted", entityId: id });
  }
}

function collectHierarchy(scene: Scene, rootId: string): Entity[] {
  const result: Entity[] = [];
  const visit = (id: string): void => {
    const entity = scene.entities.find((candidate) => candidate.id === id);
    if (!entity) return;
    result.push(entity);
    for (const child of scene.entities.filter((candidate) => candidate.parent === id)) {
      visit(child.id);
    }
  };
  visit(rootId);
  return result;
}
