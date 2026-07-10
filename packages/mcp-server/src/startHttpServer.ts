import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createProjectContext } from "./projectContext.js";
import { createMcpServer } from "./createServer.js";
import type { StartMcpOptions, RunningMcpServer } from "./startServer.js";

export interface StartHttpMcpOptions extends StartMcpOptions {
  host?: string;
  port?: number;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return undefined;
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return undefined;
  return JSON.parse(text) as unknown;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "content-type, accept, mcp-session-id, mcp-protocol-version",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  });
  res.end(payload);
}

/**
 * Local Streamable HTTP MCP for clients that break on Windows stdio (OpenCode Desktop).
 *
 * Uses the SDK's **stateless** pattern: new transport (+ server connect) per POST.
 * Reusing one transport across requests causes initialize to 500.
 * `enableJsonResponse` avoids SSE-over-POST, which some clients mishandle.
 */
export async function startHttpMcpServer(
  options: StartHttpMcpOptions
): Promise<RunningMcpServer & { url: string }> {
  const readonly = options.readonly !== false;
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 3847;

  const ctx = await createProjectContext({
    projectRoot: options.projectRoot,
    readonly,
    approveAsks: options.approveAsks ?? !readonly,
    attached: options.attached,
    clientId: options.clientId,
    engineDocsRoot: options.engineDocsRoot,
  });

  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${host}:${port}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "content-type, accept, mcp-session-id, mcp-protocol-version",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      });
      res.end();
      return;
    }

    if (url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        project: ctx.projectRoot,
        readonly: ctx.readonly,
      });
      return;
    }

    if (url.pathname !== "/mcp") {
      sendJson(res, 404, { error: "Not found. Use POST /mcp" });
      return;
    }

    // Stateless mode: GET/DELETE are not used for session streams.
    if (req.method === "GET" || req.method === "DELETE") {
      sendJson(res, 405, {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed. Use POST /mcp." },
        id: null,
      });
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      });
      return;
    }

    const server = createMcpServer(ctx);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    const cleanup = () => {
      void transport.close().catch(() => undefined);
      void server.close().catch(() => undefined);
    };
    res.on("close", cleanup);

    try {
      const parsedBody = await readJsonBody(req);
      await server.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      console.error("[arcforge-mcp] http request failed", error);
      cleanup();
      if (!res.headersSent) {
        sendJson(res, 500, {
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : String(error),
          },
          id: null,
        });
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, () => resolve());
  });

  const url = `http://${host}:${port}/mcp`;
  console.error(
    `[arcforge-mcp] http ready ${url} project=${ctx.projectRoot} readonly=${ctx.readonly}`
  );

  return {
    url,
    async stop() {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
