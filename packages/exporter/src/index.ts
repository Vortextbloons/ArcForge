export type {
  ExportOptions,
  ExportResult,
  BuildReport,
  ExportIssue,
  ProjectBundle,
  CollectedScene,
  CollectedPrefab,
  CollectedScript,
} from "./types.js";

export { exportWebBuild } from "./exportWebBuild.js";
export { exportThreeProject } from "./exportThreeProject.js";
export { loadProjectBundle, ExportLoadError } from "./loadProject.js";
export { validateProjectBundle } from "./validateProject.js";
export { prepareExport } from "./prepareExport.js";
export { optimizeAssets, copyReferencedAssets } from "./optimizeAssets.js";
export {
  createBuildReport,
  writeBuildReport,
} from "./buildReport.js";
export {
  generatePackageJson,
  generateReadme,
} from "./generatePackage.js";
