import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { EditorSession, type EditorCommand } from "@arcforge/editor-core";
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

const EditorStoreContext = createContext<EditorStoreValue | null>(null);

export function EditorStoreProvider({
  initialScene,
  children,
}: {
  initialScene: Scene;
  children: ReactNode;
}) {
  const session = useMemo(() => new EditorSession({ scene: initialScene }), [initialScene]);

  const [scene, setScene] = useState(() => session.getScene());
  const [selection, setSelectionState] = useState(() => session.getSelection());
  const [dirty, setDirty] = useState(() => session.isDirty());
  const [revision, setRevision] = useState(() => session.getRevision());
  const [historyTick, setHistoryTick] = useState(0);

  useEffect(() => {
    return session.subscribe((event) => {
      switch (event.type) {
        case "scene.changed":
        case "scene.loaded":
        case "entity.created":
        case "entity.updated":
        case "entity.deleted":
          setScene(session.getScene());
          setRevision(session.getRevision());
          break;
        case "selection.changed":
          setSelectionState(event.selection);
          break;
        case "dirty.changed":
          setDirty(event.dirty);
          break;
      }
    });
  }, [session]);

  const bumpHistory = useCallback(() => {
    setHistoryTick((n) => n + 1);
  }, []);

  const execute = useCallback(
    async (command: EditorCommand) => {
      await session.execute(command);
      bumpHistory();
    },
    [session, bumpHistory]
  );

  const undo = useCallback(async () => {
    await session.undo();
    bumpHistory();
  }, [session, bumpHistory]);

  const redo = useCallback(async () => {
    await session.redo();
    bumpHistory();
  }, [session, bumpHistory]);

  const setSelection = useCallback(
    (ids: string[]) => {
      session.setSelection(ids);
    },
    [session]
  );

  const loadScene = useCallback(
    (data: unknown, path: string | null = null) => {
      session.loadScene(data, path);
      bumpHistory();
    },
    [session, bumpHistory]
  );

  const markSaved = useCallback(
    (path?: string) => {
      session.markSaved(path);
    },
    [session]
  );

  void historyTick;

  const value = useMemo<EditorStoreValue>(
    () => ({
      session,
      scene,
      selection,
      dirty,
      revision,
      canUndo: session.canUndo,
      canRedo: session.canRedo,
      undoLabel: session.undoLabel,
      redoLabel: session.redoLabel,
      selectedEntity: selection[0] ? scene.entities.find((e) => e.id === selection[0]) : undefined,
      execute,
      undo,
      redo,
      setSelection,
      loadScene,
      markSaved,
      getScenePath: () => session.getScenePath(),
    }),
    [
      session,
      scene,
      selection,
      dirty,
      revision,
      execute,
      undo,
      redo,
      setSelection,
      loadScene,
      markSaved,
      historyTick,
    ]
  );

  return <EditorStoreContext.Provider value={value}>{children}</EditorStoreContext.Provider>;
}

export function useEditorStore(): EditorStoreValue {
  const ctx = useContext(EditorStoreContext);
  if (!ctx) {
    throw new Error("useEditorStore must be used within EditorStoreProvider");
  }
  return ctx;
}
