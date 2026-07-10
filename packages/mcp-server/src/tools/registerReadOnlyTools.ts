import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import { registerProjectTools } from "./projectTools.js";
import { registerSceneTools } from "./sceneTools.js";
import { registerComponentTools } from "./componentTools.js";
import { registerDocsTools } from "./docsTools.js";
import { registerBuildTools } from "./buildTools.js";
import { registerSceneWriteTools } from "./sceneWriteTools.js";
import { registerPrefabWriteTools } from "./prefabWriteTools.js";
import { registerScriptWriteTools } from "./scriptWriteTools.js";
import { registerDiffTools, registerPreviewTool } from "./writeExtras.js";

/** Phase 5 read-only tools. */
export function registerReadOnlyTools(server: McpServer, ctx: ProjectContext): void {
  registerProjectTools(server, ctx);
  registerSceneTools(server, ctx);
  registerComponentTools(server, ctx);
  registerDocsTools(server, ctx);
  registerBuildTools(server, ctx);
}

/** Phase 6 write tools + preview/diff review. */
export function registerWriteTools(server: McpServer, ctx: ProjectContext): void {
  registerSceneWriteTools(server, ctx);
  registerPrefabWriteTools(server, ctx);
  registerScriptWriteTools(server, ctx);
  registerPreviewTool(server, ctx);
  registerDiffTools(server, ctx);
}

/** Full tool surface for current MCP server. */
export function registerAllTools(server: McpServer, ctx: ProjectContext): void {
  registerReadOnlyTools(server, ctx);
  if (!ctx.readonly) {
    registerWriteTools(server, ctx);
  }
}
