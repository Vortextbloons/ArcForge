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
import { DEMO_SCRIPT_SOURCES } from "../scripts/demoScripts";
import { useEditorStore } from "./EditorStore";

export interface PlayModeValue {
  playing: boolean;
  logs: RuntimeLogEntry[];
  typecheck: ScriptTypecheckResult | null;
  setRuntime: (runtime: Runtime | null) => void;
  play: () => void;
  stop: () => void;
  clearLogs: () => void;
  runTypecheck: () => ScriptTypecheckResult;
}

const PlayModeContext = createContext<PlayModeValue | null>(null);

export function PlayModeProvider({ children }: { children: ReactNode }) {
  const { scene } = useEditorStore();
  const [playing, setPlaying] = useState(false);
  const [logs, setLogs] = useState<RuntimeLogEntry[]>([]);
  const [typecheck, setTypecheck] = useState<ScriptTypecheckResult | null>(
    null
  );
  const runtimeRef = useRef<Runtime | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const snapshotRef = useRef<Scene | null>(null);

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
    if (!runtime || playing) return;
    // Play mutates runtime world only; editor document stays untouched.
    snapshotRef.current = structuredClone(scene);
    runtime.logger.clear();
    setLogs([]);
    runtime.load(scene);
    runtime.setScriptsEnabled(true);
    setPlaying(true);
    runtime.logger.info("Play mode started — WASD to move");
  }, [scene, playing]);

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

  const runTypecheck = useCallback(() => {
    const result = typecheckScripts(DEMO_SCRIPT_SOURCES);
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
  }, []);

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
    [
      playing,
      logs,
      typecheck,
      setRuntime,
      play,
      stop,
      clearLogs,
      runTypecheck,
    ]
  );

  return (
    <PlayModeContext.Provider value={value}>{children}</PlayModeContext.Provider>
  );
}

export function usePlayMode(): PlayModeValue {
  const ctx = useContext(PlayModeContext);
  if (!ctx) {
    throw new Error("usePlayMode must be used within PlayModeProvider");
  }
  return ctx;
}
