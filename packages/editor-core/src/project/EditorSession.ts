import type { Scene } from "@threeforge/schemas";
import { parseScene } from "@threeforge/schemas";
import { CommandHistory, type EditorCommand } from "../undo/CommandHistory.js";
import type {
  EditorContext,
  EditorEvent,
  EditorListener,
} from "../types.js";

export interface EditorSessionOptions {
  scene: Scene;
  scenePath?: string | null;
}

/**
 * Mutable editor session: scene document, selection, command history.
 * UI and (later) MCP both drive mutations through execute().
 */
export class EditorSession implements EditorContext {
  private scene: Scene;
  private selection: string[] = [];
  private dirty = false;
  private scenePath: string | null;
  private readonly history = new CommandHistory();
  private readonly listeners = new Set<EditorListener>();
  private revision = 0;

  constructor(options: EditorSessionOptions) {
    this.scene = structuredClone(parseScene(options.scene));
    this.scenePath = options.scenePath ?? null;
  }

  getRevision(): number {
    return this.revision;
  }

  getScene(): Scene {
    return this.scene;
  }

  getScenePath(): string | null {
    return this.scenePath;
  }

  setScenePath(path: string | null): void {
    this.scenePath = path;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  getSelection(): string[] {
    return this.selection;
  }

  findEntity(id: string) {
    return this.scene.entities.find((e) => e.id === id);
  }

  subscribe(listener: EditorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event: EditorEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  setSelection(ids: string[]): void {
    const unique = [...new Set(ids)];
    const same =
      unique.length === this.selection.length &&
      unique.every((id, i) => id === this.selection[i]);
    if (same) return;
    this.selection = unique;
    this.notify({ type: "selection.changed", selection: [...unique] });
  }

  setScene(scene: Scene, opts: { markDirty?: boolean } = {}): void {
    this.scene = structuredClone(parseScene(scene));
    this.revision += 1;
    if (opts.markDirty !== false) {
      this.setDirty(true);
    }
    this.notify({ type: "scene.changed", scene: this.scene });
  }

  loadScene(data: unknown, path: string | null = null): void {
    this.scene = structuredClone(parseScene(data));
    this.scenePath = path;
    this.selection = [];
    this.history.clear();
    this.revision += 1;
    this.setDirty(false);
    this.notify({ type: "scene.loaded", scene: this.scene });
    this.notify({ type: "selection.changed", selection: [] });
  }

  markSaved(path?: string): void {
    if (path !== undefined) {
      this.scenePath = path;
    }
    this.setDirty(false);
  }

  async execute(command: EditorCommand): Promise<void> {
    await this.history.execute(command, this);
  }

  async undo(): Promise<void> {
    await this.history.undo(this);
  }

  async redo(): Promise<void> {
    await this.history.redo(this);
  }

  get canUndo(): boolean {
    return this.history.canUndo;
  }

  get canRedo(): boolean {
    return this.history.canRedo;
  }

  get undoLabel(): string | undefined {
    return this.history.undoLabel;
  }

  get redoLabel(): string | undefined {
    return this.history.redoLabel;
  }

  private setDirty(dirty: boolean): void {
    if (this.dirty === dirty) return;
    this.dirty = dirty;
    this.notify({ type: "dirty.changed", dirty });
  }
}
