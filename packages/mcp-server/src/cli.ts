#!/usr/bin/env node
import { startMcpServer } from "./startServer.js";

function usage(): never {
  console.error(`Usage:
  threeforge-mcp --project <path> [--readonly] [--attached] [--docs <engineDocsPath>]

Phase 5 exposes read-only tools:
  project.get_info, scene.list, scene.open, component.list,
  docs.search, docs.read, build.get_errors
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

  const readonly = args.includes("--readonly") || !args.includes("--write");
  const attached = args.includes("--attached");
  const engineDocsRoot = getFlag(args, "--docs");

  const running = await startMcpServer({
    projectRoot: projectRoot!,
    readonly,
    attached,
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
