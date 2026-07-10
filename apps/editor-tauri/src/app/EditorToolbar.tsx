import { useCallback } from "react";
import { CreateEntityCommand } from "@threeforge/editor-core";
import { useEditorStore } from "../app/EditorStore";
import {
  downloadSceneJson,
  openSceneFile,
  tryTauriOpenSceneDialog,
  tryTauriReadFile,
  tryTauriSaveSceneDialog,
  tryTauriWriteFile,
} from "../project/sceneIo";

export function EditorToolbar() {
  const {
    scene,
    dirty,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    undo,
    redo,
    execute,
    loadScene,
    markSaved,
    getScenePath,
  } = useEditorStore();

  const handleOpen = useCallback(async () => {
    const tauriPath = await tryTauriOpenSceneDialog();
    if (tauriPath) {
      const contents = await tryTauriReadFile(tauriPath);
      if (contents) {
        loadScene(JSON.parse(contents), tauriPath);
        return;
      }
    }
    const file = await openSceneFile();
    loadScene(file.scene, file.path);
  }, [loadScene]);

  const handleSave = useCallback(async () => {
    const text = JSON.stringify(scene, null, 2);
    const existing = getScenePath();

    if (existing && existing.endsWith(".json")) {
      const written = await tryTauriWriteFile(existing, text);
      if (written) {
        markSaved(existing);
        return;
      }
    }

    const savePath = await tryTauriSaveSceneDialog(
      existing ?? `${scene.name}.scene.json`
    );
    if (savePath) {
      const written = await tryTauriWriteFile(savePath, text);
      if (written) {
        markSaved(savePath);
        return;
      }
    }

    downloadSceneJson(scene, existing ?? `${scene.name}.scene.json`);
    markSaved(existing ?? `${scene.name}.scene.json`);
  }, [scene, getScenePath, markSaved]);

  return (
    <header className="editor__toolbar">
      <span className="editor__brand">ThreeForge</span>
      <span className="editor__scene">
        {scene.name}
        {dirty ? " •" : ""}
      </span>

      <div className="toolbar__actions">
        <button type="button" className="btn btn--small" onClick={() => void handleOpen()}>
          Open
        </button>
        <button type="button" className="btn btn--small" onClick={() => void handleSave()}>
          Save
        </button>
        <button
          type="button"
          className="btn btn--small"
          disabled={!canUndo}
          title={undoLabel}
          onClick={() => void undo()}
        >
          Undo
        </button>
        <button
          type="button"
          className="btn btn--small"
          disabled={!canRedo}
          title={redoLabel}
          onClick={() => void redo()}
        >
          Redo
        </button>
        <button
          type="button"
          className="btn btn--small"
          onClick={() => void execute(new CreateEntityCommand({ name: "Entity" }))}
        >
          + Entity
        </button>
      </div>
    </header>
  );
}
