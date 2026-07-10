import { createContext, type Context } from "react";
import type { ProjectSessionValue } from "./projectSessionTypes";

const GLOBAL_KEY = "__arcforge_project_session_context__";

type GlobalWithSession = typeof globalThis & {
  [GLOBAL_KEY]?: Context<ProjectSessionValue | null>;
};

export const ProjectSessionContext: Context<ProjectSessionValue | null> = (() => {
  const g = globalThis as GlobalWithSession;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createContext<ProjectSessionValue | null>(null);
  }
  return g[GLOBAL_KEY];
})();
