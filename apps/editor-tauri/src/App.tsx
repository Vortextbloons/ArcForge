import { useEffect } from "react";
import { DeleteEntityCommand } from "@arcforge/editor-core";
import { EditorStoreProvider, useEditorStore } from "./app/EditorStore";
import { PlayModeProvider, usePlayMode } from "./app/PlayModeContext";
import { EditorToolbar } from "./app/EditorToolbar";
import { HierarchyPanel } from "./hierarchy/HierarchyPanel";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { AssetBrowserPanel } from "./asset-browser/AssetBrowserPanel";
import { ConsolePanel } from "./console/ConsolePanel";
import { ViewportCanvas } from "./viewport/ViewportCanvas";
import sampleScene from "./fixtures/Main.scene.json";

function useEditorHotkeys() {
  const { canUndo, canRedo, undo, redo, selection, execute } = useEditorStore();
  const { playing, play, stop } = usePlayMode();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      const mod = event.ctrlKey || event.metaKey;

      if (!typing && event.key === "F5") {
        event.preventDefault();
        if (playing) stop();
        else play();
        return;
      }

      if (mod && event.key.toLowerCase() === "z" && !event.shiftKey) {
        if (typing || playing) return;
        event.preventDefault();
        if (canUndo) void undo();
        return;
      }

      if (
        (mod && event.key.toLowerCase() === "y") ||
        (mod && event.shiftKey && event.key.toLowerCase() === "z")
      ) {
        if (typing || playing) return;
        event.preventDefault();
        if (canRedo) void redo();
        return;
      }

      if (
        !typing &&
        !playing &&
        (event.key === "Delete" || event.key === "Backspace")
      ) {
        const id = selection[0];
        if (!id) return;
        event.preventDefault();
        void execute(new DeleteEntityCommand(id));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canUndo, canRedo, undo, redo, selection, execute, playing, play, stop]);
}

function EditorLayout() {
  useEditorHotkeys();

  return (
    <div className="editor">
      <EditorToolbar />
      <HierarchyPanel />
      <div className="editor__center">
        <main className="editor__viewport">
          <ViewportCanvas />
        </main>
        <div className="editor__bottom">
          <AssetBrowserPanel />
          <ConsolePanel />
        </div>
      </div>
      <InspectorPanel />
    </div>
  );
}

function App() {
  return (
    <EditorStoreProvider initialScene={sampleScene}>
      <PlayModeProvider>
        <EditorLayout />
      </PlayModeProvider>
    </EditorStoreProvider>
  );
}

export default App;
