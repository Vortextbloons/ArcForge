import type { Runtime, RuntimeLogEntry } from "@arcforge/engine";
import type { ScriptTypecheckResult } from "@arcforge/engine/compiler";

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
