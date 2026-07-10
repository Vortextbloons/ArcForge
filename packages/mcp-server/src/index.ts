export type { ProjectContext, ProjectValidationResult, SceneSummary } from "./projectContext.js";
export { createProjectContext, resolveEngineDocsRoot } from "./projectContext.js";
export { createMcpServer } from "./createServer.js";
export {
  startMcpServer,
  type StartMcpOptions,
  type RunningMcpServer,
  type MCPServer,
} from "./startServer.js";
export {
  registerReadOnlyTools,
  registerWriteTools,
  registerAllTools,
} from "./tools/registerReadOnlyTools.js";
export { jsonResult, errorResult } from "./toolResult.js";
export {
  decidePermission,
  loadOrCreatePolicy,
  type PermissionDecision,
} from "./auth/permissions.js";
export {
  DEFAULT_POLICY,
  type McpPolicy,
  type PolicyTool,
  type PermissionMode,
} from "./auth/policyTypes.js";
export { ProjectMutator } from "./mutations/projectMutator.js";
export { DiffLog } from "./diff/diffLog.js";
