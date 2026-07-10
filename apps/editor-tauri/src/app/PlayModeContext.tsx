import { useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { Runtime } from "@arcforge/engine";
import type { ScriptTypecheckResult } from "@arcforge/engine/compiler";
import type { Scene } from "@arcforge/schemas";
import { DEMO_SCRIPTS, DEMO_SCRIPT_SOURCES } from "../scripts/demoScripts";
import { useEditorStore } from "./EditorStore";
import { useProjectSession } from "./ProjectSession";
import { loadProjectBehaviourScripts } from "../project/loadProjectScripts";
import { loadProjectPrefabs } from "../project/loadProjectPrefabs";
import { loadProjectScenes } from "../project/loadProjectScenes";
import { joinProjectPath } from "../project/projectModel";
import { PlayModeContext } from "./playModeContextInstance";
import type { PlayModeValue } from "./playModeTypes";

export type { PlayModeValue } from "./playModeTypes";

export function PlayModeProvider({ children }: { children: ReactNode }) {
  const { scene } = useEditorStore();
  const { project } = useProjectSession();
  const [playing, setPlaying] = useState(false);
  const [logs, setLogs] = useState<PlayModeValue["logs"]>([]);
  const [typecheck, setTypecheck] = useState<ScriptTypecheckResult | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const snapshotRef = useRef<Scene | null>(null);
  const playBusyRef = useRef(false);

  const setRuntime = useCallback((next: Runtime | null) => {
    unsubRef.current?.();
    unsubRef.current = null;
    runtimeRef.current = next;
    if (!next) return;
    setLogs(next.logger.getEntries());
    unsubRef.current = next.logger.subscribe((entry) => {
      setLogs((prev) => [...prev.slice(-199), entry]);
    });
  }, []);

  const play = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime || playing || playBusyRef.current) return;
    playBusyRef.current = true;

    void (async () => {
      try {
        snapshotRef.current = structuredClone(scene);
        runtime.logger.clear();
        setLogs([]);

        runtime.scripts.clear();
        runtime.registerScripts(DEMO_SCRIPTS);
        runtime.prefabs.clear();
        runtime.scenes.clear();
        runtime.extensions.clearSystems();

        if (project?.root) {
          const { convertFileSrc } = await import("@tauri-apps/api/core");
          runtime.setAssetUrlResolver((path) =>
            convertFileSrc(joinProjectPath(project.root, path))
          );
          const loadedPrefabs = await loadProjectPrefabs(project.root);
          runtime.registerPrefabs(loadedPrefabs.prefabs);
          for (const message of loadedPrefabs.errors) runtime.logger.error(message);
          const loadedScenes = await loadProjectScenes(project.root);
          runtime.registerScenes(loadedScenes.scenes);
          for (const message of loadedScenes.errors) runtime.logger.error(message);

          const loaded = await loadProjectBehaviourScripts(project.root);
          if (loaded.errors.length > 0) {
            for (const message of loaded.errors) {
              runtime.logger.error(message);
            }
          }
          const count = Object.keys(loaded.modules).length;
          if (count > 0) {
            runtime.registerScripts(loaded.modules);
            runtime.logger.info(`Loaded ${count} project script(s)`);
          } else {
            runtime.logger.warn("No project scripts compiled — using demo scripts only");
          }
          for (const system of loaded.systems) runtime.extensions.registerSystem(system);
          if (loaded.systems.length > 0) {
            runtime.logger.info(`Loaded ${loaded.systems.length} project runtime system(s)`);
          }
          const { typecheckScripts } = await import("@arcforge/engine/compiler");
          setTypecheck(typecheckScripts(loaded.sources));
        }

        await runtime.whenPhysicsReady();
        runtime.load(scene);
        runtime.setScriptsEnabled(true);
        setPlaying(true);
        runtime.logger.info("Play mode started — WASD / arrows to drive");
      } catch (error) {
        runtime.logger.error(
          error instanceof Error ? error.message : `Play failed: ${String(error)}`
        );
      } finally {
        playBusyRef.current = false;
      }
    })();
  }, [scene, playing, project?.root]);

  const stop = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !playing) return;
    runtime.setScriptsEnabled(false);
    const snapshot = snapshotRef.current ?? scene;
    snapshotRef.current = null;
    setPlaying(false);
    runtime.load(snapshot);
    runtime.logger.info("Play mode stopped");
  }, [playing, scene]);

  const clearLogs = useCallback(() => {
    runtimeRef.current?.logger.clear();
    setLogs([]);
  }, []);

  const runTypecheck = useCallback(async () => {
    let sources = DEMO_SCRIPT_SOURCES;
    if (project?.root) {
      const loaded = await loadProjectBehaviourScripts(project.root);
      if (loaded.sources.length > 0) sources = loaded.sources;
    }
    const { typecheckScripts } = await import("@arcforge/engine/compiler");
    const result = typecheckScripts(sources);
    setTypecheck(result);
    const runtime = runtimeRef.current;
    if (!runtime) return result;
    if (result.ok) {
      runtime.logger.info("Script typecheck passed");
    } else {
      for (const diag of result.diagnostics) {
        runtime.logger.error(`${diag.file}: ${diag.message}`, {
          module: diag.file,
        });
      }
    }
    return result;
  }, [project?.root]);

  const value = useMemo<PlayModeValue>(
    () => ({
      playing,
      logs,
      typecheck,
      setRuntime,
      play,
      stop,
      clearLogs,
      runTypecheck,
    }),
    [playing, logs, typecheck, setRuntime, play, stop, clearLogs, runTypecheck]
  );

  return <PlayModeContext.Provider value={value}>{children}</PlayModeContext.Provider>;
}

export function usePlayMode(): PlayModeValue {
  const ctx = useContext(PlayModeContext);
  if (!ctx) {
    throw new Error("usePlayMode must be used within PlayModeProvider");
  }
  return ctx;
}

// Force full reload of this module on HMR so Provider/hook stay in sync with consumers.
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    import.meta.hot?.invalidate();
  });
}
