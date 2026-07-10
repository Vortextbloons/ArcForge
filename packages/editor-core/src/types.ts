import type { Entity, Scene } from "@threeforge/schemas";

export type EditorEvent =
  | { type: "scene.loaded"; scene: Scene }
  | { type: "scene.changed"; scene: Scene }
  | { type: "selection.changed"; selection: string[] }
  | { type: "entity.created"; entity: Entity }
  | { type: "entity.updated"; entity: Entity }
  | { type: "entity.deleted"; entityId: string }
  | { type: "dirty.changed"; dirty: boolean };

export type EditorListener = (event: EditorEvent) => void;

export interface EditorContext {
  getScene(): Scene;
  setScene(scene: Scene, opts?: { markDirty?: boolean }): void;
  getSelection(): string[];
  setSelection(ids: string[]): void;
  findEntity(id: string): Entity | undefined;
  notify(event: EditorEvent): void;
}
