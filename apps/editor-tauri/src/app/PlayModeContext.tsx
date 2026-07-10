import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  typecheckScripts,
  type Runtime,
  type RuntimeLogEntry,
  type ScriptTypecheckResult,
} from "@arcforge/engine";
import type { Scene } from "@arcforge/schemas";
import { DEMO_SCRIPTS, DEMO_SCRIPT_SOURCES } from "../scripts/demoScripts";
import { useEditorStore } from "./EditorStore";
import { useProjectSession } from "./ProjectSession";
import { loadProjectBehaviourScripts } from "../project/loadProjectScripts";

export interface PlayModeValue {
  playing: boolean;
  logs: RuntimeLogEntry[];
  typecheck: ScriptTypecheckResult | null;
  setRuntime: (runtime: Runtime | null) => void;
  play: () => void;
  stop: () => void;
  clearLogs: () => void;
  runTypecheck: () => Promise<ScriptTypecheckResult>;
}

const PlayModeContext = createContext<PlayModeValue | null>(null);

export function PlayModeProvider({ children }: { children: ReactNode }) {
  const { scene } = useEditorStore();
  const { project } = useProjectSession();
  const [playing, setPlaying] = useState(false);
  const [logs, setLogs] = useState<RuntimeLogEntry[]>([]);
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

        // Always keep demo scripts; overlay project scripts when a disk project is open.
        runtime.scripts.clear();
        runtime.registerScripts(DEMO_SCRIPTS);

        if (project?.root) {
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

  const value = useMemo(
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
