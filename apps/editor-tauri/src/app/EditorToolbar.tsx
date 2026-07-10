import { useCallback, useState } from "react";
import { CreateEntityCommand } from "@arcforge/editor-core";
import { useEditorStore } from "../app/EditorStore";
import { usePlayMode } from "../app/PlayModeContext";
import { useProjectSession } from "../app/ProjectSession";
import { ConnectMcpDialog } from "../mcp/ConnectMcpDialog";
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
  const { playing, play, stop, runTypecheck } = usePlayMode();
  const { project, closeProject, mcpStatus, restartMcp } = useProjectSession();
  const [mcpOpen, setMcpOpen] = useState(false);

  const handleHome = useCallback(() => {
    if (playing) stop();
    if (dirty) {
      const ok = window.confirm("Leave project? Unsaved scene changes may be lost.");
      if (!ok) return;
    }
    closeProject();
  }, [playing, stop, dirty, closeProject]);

  const handleOpen = useCallback(async () => {
    if (playing) return;
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
  }, [loadScene, playing]);

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

    const savePath = await tryTauriSaveSceneDialog(existing ?? `${scene.name}.scene.json`);
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
      <button type="button" className="editor__brand btn-link" onClick={handleHome} title="Back to start">
        ArcForge
      </button>
      <span className="editor__scene">
        {project?.manifest.name ? `${project.manifest.name} / ` : ""}
        {scene.name}
        {dirty ? " •" : ""}
        {playing ? " — Play" : ""}
      </span>

      <div className="toolbar__actions">
        <button type="button" className="btn btn--small" disabled={playing} onClick={handleHome}>
          Home
        </button>
        <button
          type="button"
          className="btn btn--small"
          disabled={playing}
          onClick={() => void handleOpen()}
        >
          Open Scene
        </button>
        <button
          type="button"
          className="btn btn--small"
          disabled={playing}
          onClick={() => void handleSave()}
        >
          Save
        </button>
        <button
          type="button"
          className="btn btn--small"
          disabled={!canUndo || playing}
          title={undoLabel}
          onClick={() => void undo()}
        >
          Undo
        </button>
        <button
          type="button"
          className="btn btn--small"
          disabled={!canRedo || playing}
          title={redoLabel}
          onClick={() => void redo()}
        >
          Redo
        </button>
        <button
          type="button"
          className="btn btn--small"
          disabled={playing}
          onClick={() => void execute(new CreateEntityCommand({ name: "Entity" }))}
        >
          + Entity
        </button>
        <button type="button" className="btn btn--small" onClick={() => runTypecheck()}>
          Typecheck
        </button>
        <button
          type="button"
          className={`btn btn--small ${mcpStatus.running ? "btn--mcp-on" : ""}`}
          title={
            mcpStatus.running
              ? `MCP running at ${mcpStatus.url ?? "http://127.0.0.1:3847/mcp"}`
              : mcpStatus.error
                ? `MCP error: ${mcpStatus.error}`
                : "MCP server (starts with project)"
          }
          onClick={() => setMcpOpen(true)}
        >
          <span
            className={`mcp-dot ${mcpStatus.running ? "mcp-dot--on" : mcpStatus.error ? "mcp-dot--err" : ""}`}
            aria-hidden
          />
          Connect MCP
        </button>
        {playing ? (
          <button type="button" className="btn btn--small btn--danger" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="button" className="btn btn--small btn--play" onClick={play}>
            Play
          </button>
        )}
      </div>

      <ConnectMcpDialog
        open={mcpOpen}
        onClose={() => setMcpOpen(false)}
        scenePath={getScenePath()}
        sceneName={scene.name}
        projectRoot={project?.root || null}
        mcpStatus={mcpStatus}
        onRestartMcp={() => void restartMcp(true)}
      />
    </header>
  );
}
