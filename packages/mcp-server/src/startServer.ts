import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createProjectContext } from "./projectContext.js";
import { createMcpServer } from "./createServer.js";

export interface StartMcpOptions {
  projectRoot: string;
  readonly?: boolean;
  attached?: boolean;
  engineDocsRoot?: string;
}

export interface RunningMcpServer {
  server: McpServer;
  stop(): Promise<void>;
}

/**
 * Start ThreeForge MCP over stdio (sidecar / CLI).
 * Logs must go to stderr only — stdout is the JSON-RPC channel.
 */
export async function startMcpServer(
  options: StartMcpOptions
): Promise<RunningMcpServer> {
  const ctx = await createProjectContext({
    projectRoot: options.projectRoot,
    readonly: options.readonly !== false,
    attached: options.attached,
    engineDocsRoot: options.engineDocsRoot,
  });

  const server = createMcpServer(ctx);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(
    `[threeforge-mcp] ready project=${ctx.projectRoot} readonly=${ctx.readonly} docs=${ctx.docs.sources.length}`
  );

  return {
    server,
    async stop() {
      await server.close();
    },
  };
}

export interface MCPServer {
  start(projectPath: string): Promise<void>;
  stop(): Promise<void>;
}
