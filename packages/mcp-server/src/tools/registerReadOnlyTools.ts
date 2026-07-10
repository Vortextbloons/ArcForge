import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import { registerProjectTools } from "./projectTools.js";
import { registerSceneTools } from "./sceneTools.js";
import { registerComponentTools } from "./componentTools.js";
import { registerDocsTools } from "./docsTools.js";
import { registerBuildTools } from "./buildTools.js";

/** Phase 5 read-only tool set. Write tools land in Phase 6. */
export function registerReadOnlyTools(
  server: McpServer,
  ctx: ProjectContext
): void {
  registerProjectTools(server, ctx);
  registerSceneTools(server, ctx);
  registerComponentTools(server, ctx);
  registerDocsTools(server, ctx);
  registerBuildTools(server, ctx);
}
