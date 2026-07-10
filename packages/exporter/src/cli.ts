#!/usr/bin/env node
import path from "node:path";
import { exportWebBuild } from "./exportWebBuild.js";
import { exportThreeProject } from "./exportThreeProject.js";

function usage(): never {
  console.log(`Usage:
  threeforge-export <web|three> <projectRoot> <outputDir> [--dry-run]

Examples:
  threeforge-export web ./examples/platformer ./exports/platformer-web
  threeforge-export three ./examples/platformer ./exports/platformer-three
`);
  process.exit(1);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 3) usage();

  const mode = args[0];
  const projectRoot = path.resolve(args[1]!);
  const output = path.resolve(args[2]!);
  const dryRun = args.includes("--dry-run");

  if (mode !== "web" && mode !== "three") usage();

  const result =
    mode === "web"
      ? await exportWebBuild({ projectRoot, output, dryRun })
      : await exportThreeProject({ projectRoot, output, dryRun });

  const { report } = result;
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        mode: report.mode,
        output: report.output,
        durationMs: report.durationMs,
        issues: report.issues,
        assetsCopied: report.assetsCopied.length,
        scenes: report.scenes.length,
        scripts: report.scripts.length,
      },
      null,
      2
    )
  );

  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
