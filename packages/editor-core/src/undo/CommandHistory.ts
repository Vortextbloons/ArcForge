import type { EditorContext } from "../types.js";

export interface EditorCommand {
  id: string;
  label: string;
  execute(ctx: EditorContext): Promise<void> | void;
  undo(ctx: EditorContext): Promise<void> | void;
}

export class CommandHistory {
  private undoStack: EditorCommand[] = [];
  private redoStack: EditorCommand[] = [];

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoLabel(): string | undefined {
    return this.undoStack.at(-1)?.label;
  }

  get redoLabel(): string | undefined {
    return this.redoStack.at(-1)?.label;
  }

  async execute(command: EditorCommand, ctx: EditorContext): Promise<void> {
    await command.execute(ctx);
    this.undoStack.push(command);
    this.redoStack = [];
  }

  async undo(ctx: EditorContext): Promise<void> {
    const command = this.undoStack.pop();
    if (!command) return;
    await command.undo(ctx);
    this.redoStack.push(command);
  }

  async redo(ctx: EditorContext): Promise<void> {
    const command = this.redoStack.pop();
    if (!command) return;
    await command.execute(ctx);
    this.undoStack.push(command);
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
