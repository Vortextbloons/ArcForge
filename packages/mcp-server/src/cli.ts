#!/usr/bin/env node
import { startMcpServer } from "./startServer.js";
import { startHttpMcpServer } from "./startHttpServer.js";

function usage(): never {
  console.error(`Usage:
  arcforge-mcp --project <path> [--readonly | --write] [--attached] [--docs <engineDocsPath>] [--client <id>]
  arcforge-mcp --project <path> --http [--port 3847] [--host 127.0.0.1] [--readonly | --write]

Transports:
  (default) stdio — Cursor / Claude / most IDEs
  --http          — Streamable HTTP for OpenCode Desktop on Windows (remote MCP URL)

Phase 5–8 tools (write tools require --write):
  Docs:  docs.get_relevant, docs.search, docs.read, docs.list_sources, docs.refresh_index
  Read:  project.get_info, scene.list/open, component.list, plugin.*, asset.list/inspect, build.get_errors
  Write: scene.*, prefab.*, script.*, plugin.create/enable/disable, asset.import, auth.pair/revoke, build.preview
  Review: diff.list, diff.summarize

Policy: <project>/.threeforge/mcp.policy.json · Clients: .threeforge/mcp.clients.json · Docs: .arcforge/docs.index.json
`);
  process.exit(1);
}

function getFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const projectRoot = getFlag(args, "--project");
  if (!projectRoot) usage();

  const write = args.includes("--write");
  const readonly = args.includes("--readonly") || !write;
  const attached = args.includes("--attached");
  const http = args.includes("--http");
  const engineDocsRoot = getFlag(args, "--docs");
  const clientId = getFlag(args, "--client");
  const host = getFlag(args, "--host") ?? "127.0.0.1";
  const portRaw = getFlag(args, "--port");
  const port = portRaw ? Number(portRaw) : 3847;
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid --port: ${portRaw}`);
  }

  const running = http
    ? await startHttpMcpServer({
        projectRoot: projectRoot!,
        readonly,
        approveAsks: write,
        attached,
        clientId,
        engineDocsRoot,
        host,
        port,
      })
    : await startMcpServer({
        projectRoot: projectRoot!,
        readonly,
        approveAsks: write,
        attached,
        clientId,
        engineDocsRoot,
      });

  const shutdown = async () => {
    await running.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
