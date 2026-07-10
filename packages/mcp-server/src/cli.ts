#!/usr/bin/env node
import { startMcpServer } from "./startServer.js";

function usage(): never {
  console.error(`Usage:
  arcforge-mcp --project <path> [--readonly | --write] [--attached] [--docs <engineDocsPath>] [--client <id>]

Phase 5 read tools + Phase 6 write tools (with --write):
  Read:  project.get_info, scene.list/open, component.list, docs.*, build.get_errors
  Write: scene.create_entity, scene.update_component, prefab.create, script.create/edit, build.preview
  Review: diff.list, diff.summarize

Policy lives in <project>/.threeforge/mcp.policy.json
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
  const engineDocsRoot = getFlag(args, "--docs");
  const clientId = getFlag(args, "--client");

  const running = await startMcpServer({
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
