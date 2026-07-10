export type { EditorContext, EditorEvent, EditorListener } from "./types.js";
export { CommandHistory, type EditorCommand } from "./undo/CommandHistory.js";
export { EditorSession, type EditorSessionOptions } from "./project/EditorSession.js";
export {
  createEntityId,
  CreateEntityCommand,
  DeleteEntityCommand,
  RenameEntityCommand,
  ReparentEntityCommand,
  AddComponentCommand,
  RemoveComponentCommand,
  UpdateComponentCommand,
} from "./commands/entityCommands.js";
export {
  assetImportSettingsPath,
  guessAssetKind,
  importAssetFile,
  readAssetImportSettings,
  updateAssetImportSettings,
} from "./commands/assetImport.js";
export {
  analyzeScenePerformance,
  analyzeProjectPerformance,
  type PerformanceWarning,
  type PerformanceScanOptions,
} from "./validation/performanceWarnings.js";
