import type { EditorSession, EditorCommand } from "@arcforge/editor-core";
import type { Entity, Scene } from "@arcforge/schemas";

export interface EditorStoreValue {
  session: EditorSession;
  scene: Scene;
  selection: string[];
  dirty: boolean;
  revision: number;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel?: string;
  redoLabel?: string;
  selectedEntity: Entity | undefined;
  execute: (command: EditorCommand) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  setSelection: (ids: string[]) => void;
  loadScene: (data: unknown, path?: string | null) => void;
  markSaved: (path?: string) => void;
  getScenePath: () => string | null;
}
