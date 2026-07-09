import type { Entity, Scene } from "@threeforge/schemas";

export interface EditorCommand {
  id: string;
  label: string;
  execute(ctx: EditorContext): Promise<void>;
  undo(ctx: EditorContext): Promise<void>;
}

export interface EditorContext {
  scene: Scene;
  selection: string[];
  notify(event: EditorEvent): void;
}

export type EditorEvent =
  | { type: "entity.created"; entity: Entity }
  | { type: "entity.updated"; entity: Entity }
  | { type: "entity.deleted"; entityId: string };

export class CommandHistory {
  private undoStack: EditorCommand[] = [];
  private redoStack: EditorCommand[] = [];

  async execute(command: EditorCommand, ctx: EditorContext): Promise<void> {
    await command.execute(ctx);
    this.undoStack.push(command);
    this.redoStack = [];
  }

  async undo(ctx: EditorContext): Promise<void> {
    const command = this.undoStack.pop();
    if (command) {
      await command.undo(ctx);
      this.redoStack.push(command);
    }
  }

  async redo(ctx: EditorContext): Promise<void> {
    const command = this.redoStack.pop();
    if (command) {
      await command.execute(ctx);
      this.undoStack.push(command);
    }
  }
}
