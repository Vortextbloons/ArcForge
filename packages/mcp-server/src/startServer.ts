import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createProjectContext } from "./projectContext.js";
import { createMcpServer } from "./createServer.js";

export interface StartMcpOptions {
  projectRoot: string;
  readonly?: boolean;
  /** Auto-approve policy "ask" in headless mode. */
  approveAsks?: boolean;
  attached?: boolean;
  clientId?: string;
  engineDocsRoot?: string;
}

export interface RunningMcpServer {
  server: McpServer;
  stop(): Promise<void>;
}

/**
 * Start ArcForge MCP over stdio (sidecar / CLI).
 * Logs must go to stderr only — stdout is the JSON-RPC channel.
 */
export async function startMcpServer(options: StartMcpOptions): Promise<RunningMcpServer> {
  const readonly = options.readonly !== false;
  const ctx = await createProjectContext({
    projectRoot: options.projectRoot,
    readonly,
    approveAsks: options.approveAsks ?? !readonly,
    attached: options.attached,
    clientId: options.clientId,
    engineDocsRoot: options.engineDocsRoot,
  });

  const server = createMcpServer(ctx);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(
    `[arcforge-mcp] ready project=${ctx.projectRoot} readonly=${ctx.readonly} approveAsks=${ctx.approveAsks} docs=${ctx.docs.sources.length}`
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
