/**
 * Node-only APIs (filesystem). Do not import from browser / Tauri webview code.
 * Use: `import { ... } from "@arcforge/editor-core/node"`
 */
export {
  assetImportSettingsPath,
  buildDefaultAssetImportSettings,
  guessAssetKind,
  importAssetFile,
  readAssetImportSettings,
  updateAssetImportSettings,
} from "./commands/assetImport.js";
export {
  analyzeProjectPerformance,
  analyzeScenePerformance,
  PERFORMANCE_DEFAULTS,
  type PerformanceScanOptions,
  type PerformanceWarning,
} from "./validation/performanceWarnings.node.js";
