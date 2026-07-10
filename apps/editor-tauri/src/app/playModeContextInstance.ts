import { createContext, type Context } from "react";
import type { PlayModeValue } from "./playModeTypes";

const GLOBAL_KEY = "__arcforge_play_mode_context__";

type GlobalWithPlayMode = typeof globalThis & {
  [GLOBAL_KEY]?: Context<PlayModeValue | null>;
};

/**
 * Stable context identity across Vite HMR.
 * Without this, Fast Refresh recreates `createContext()` and
 * `usePlayMode()` briefly sees null even inside PlayModeProvider.
 */
export const PlayModeContext: Context<PlayModeValue | null> = (() => {
  const g = globalThis as GlobalWithPlayMode;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createContext<PlayModeValue | null>(null);
  }
  return g[GLOBAL_KEY];
})();
