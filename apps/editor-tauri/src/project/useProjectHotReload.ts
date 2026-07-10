import { useEffect, useRef } from "react";
import { useEditorStore } from "../app/EditorStore";
import { usePlayMode } from "../app/PlayModeContext";
import { useProjectSession } from "../app/ProjectSession";
import {
  readSceneFromDisk,
  sceneRelFromAbsolute,
  startProjectHotReload,
} from "./projectHotReload";

/**
 * Watches MCP writes / scene file changes and reloads the editor viewport.
 */
export function useProjectHotReload(): void {
  const { project } = useProjectSession();
  const { loadScene, getScenePath, dirty } = useEditorStore();
  const { playing, stop } = usePlayMode();
  const dirtyRef = useRef(dirty);
  const playingRef = useRef(playing);
  const stopRef = useRef(stop);
  dirtyRef.current = dirty;
  playingRef.current = playing;
  stopRef.current = stop;

  useEffect(() => {
    if (!project?.root) return;

    const sceneRel =
      sceneRelFromAbsolute(project.root, getScenePath()) ??
      project.manifest.defaultScene ??
      "scenes/Main.scene.json";

    return startProjectHotReload({
      projectRoot: project.root,
      sceneRel,
      onChange: (event) => {
        // Don't clobber unsaved local editor edits.
        if (dirtyRef.current) return;

        const target =
          event.scene ??
          sceneRelFromAbsolute(project.root, getScenePath()) ??
          project.manifest.defaultScene ??
          "scenes/Main.scene.json";

        void (async () => {
          const scene = await readSceneFromDisk(project.root, target);
          if (!scene) return;
          if (playingRef.current) stopRef.current();
          loadScene(scene, getScenePath() ?? target);
        })();
      },
    });
  }, [project?.root, project?.manifest.defaultScene, loadScene, getScenePath]);
}
