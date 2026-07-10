import { createContext, type Context } from "react";
import type { EditorStoreValue } from "./editorStoreTypes";

const GLOBAL_KEY = "__arcforge_editor_store_context__";

type GlobalWithStore = typeof globalThis & {
  [GLOBAL_KEY]?: Context<EditorStoreValue | null>;
};

export const EditorStoreContext: Context<EditorStoreValue | null> = (() => {
  const g = globalThis as GlobalWithStore;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createContext<EditorStoreValue | null>(null);
  }
  return g[GLOBAL_KEY];
})();
