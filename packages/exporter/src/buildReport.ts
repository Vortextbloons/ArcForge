import type { BuildReport, ExportIssue } from "./types.js";
import { writeJsonFile, writeTextFile } from "./fsUtils.js";
import path from "node:path";

export function createBuildReport(partial: {
  mode: BuildReport["mode"];
  projectName: string;
  output: string;
  startedAt: Date;
  finishedAt: Date;
  scenes: string[];
  prefabs: string[];
  scripts: string[];
  assetsCopied: string[];
  issues: ExportIssue[];
  scriptDiagnostics: BuildReport["scriptDiagnostics"];
  dryRun: boolean;
}): BuildReport {
  const hasErrors = partial.issues.some((i) => i.severity === "error");
  return {
    ok: !hasErrors,
    mode: partial.mode,
    projectName: partial.projectName,
    output: partial.output,
    startedAt: partial.startedAt.toISOString(),
    finishedAt: partial.finishedAt.toISOString(),
    durationMs: partial.finishedAt.getTime() - partial.startedAt.getTime(),
    scenes: partial.scenes,
    prefabs: partial.prefabs,
    scripts: partial.scripts,
    assetsCopied: partial.assetsCopied,
    issues: partial.issues,
    scriptDiagnostics: partial.scriptDiagnostics,
    dryRun: partial.dryRun,
  };
}

export async function writeBuildReport(outputDir: string, report: BuildReport): Promise<string> {
  const jsonPath = path.join(outputDir, "build-report.json");
  await writeJsonFile(jsonPath, report);

  const lines = [
    `# Build Report — ${report.projectName}`,
    "",
    `- Mode: ${report.mode}`,
    `- OK: ${report.ok}`,
    `- Dry run: ${report.dryRun}`,
    `- Output: ${report.output}`,
    `- Duration: ${report.durationMs}ms`,
    `- Scenes: ${report.scenes.length}`,
    `- Prefabs: ${report.prefabs.length}`,
    `- Scripts: ${report.scripts.length}`,
    `- Assets copied: ${report.assetsCopied.length}`,
    "",
  ];

  if (report.issues.length > 0) {
    lines.push("## Issues", "");
    for (const issue of report.issues) {
      const loc = issue.path ? ` (${issue.path})` : "";
      lines.push(`- [${issue.severity}] ${issue.code}: ${issue.message}${loc}`);
    }
    lines.push("");
  }

  if (report.assetsCopied.length > 0) {
    lines.push("## Assets", "");
    for (const a of report.assetsCopied) lines.push(`- ${a}`);
    lines.push("");
  }

  const mdPath = path.join(outputDir, "build-report.md");
  await writeTextFile(mdPath, `${lines.join("\n")}\n`);
  return jsonPath;
}
