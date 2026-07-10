import type { ExportIssue, ExportOptions, ProjectBundle } from "./types.js";
import { ExportLoadError, loadProjectBundle } from "./loadProject.js";
import { validateProjectBundle } from "./validateProject.js";
import { createBuildReport } from "./buildReport.js";
import type { BuildReport } from "./types.js";

export type PreparedExport =
  | {
      ok: true;
      bundle: ProjectBundle;
      issues: ExportIssue[];
      scriptDiagnostics: BuildReport["scriptDiagnostics"];
      startedAt: Date;
    }
  | {
      ok: false;
      report: BuildReport;
    };

/**
 * Shared load + validate gate used by both web and three-project exporters.
 */
export async function prepareExport(
  options: ExportOptions,
  mode: BuildReport["mode"]
): Promise<PreparedExport> {
  const startedAt = new Date();
  let issues: ExportIssue[] = [];
  let bundle: ProjectBundle;

  try {
    const loaded = await loadProjectBundle(options.projectRoot);
    bundle = loaded.bundle;
    issues = loaded.issues;
  } catch (err) {
    if (err instanceof ExportLoadError) {
      return {
        ok: false,
        report: createBuildReport({
          mode,
          projectName: "unknown",
          output: options.output,
          startedAt,
          finishedAt: new Date(),
          scenes: [],
          prefabs: [],
          scripts: [],
          assetsCopied: [],
          issues: err.issues,
          scriptDiagnostics: [],
          dryRun: Boolean(options.dryRun),
        }),
      };
    }
    throw err;
  }

  const validation = validateProjectBundle(bundle, issues);
  if (!validation.ok) {
    return {
      ok: false,
      report: createBuildReport({
        mode,
        projectName: bundle.manifest.name,
        output: options.output,
        startedAt,
        finishedAt: new Date(),
        scenes: bundle.scenes.map((s) => s.path),
        prefabs: bundle.prefabs.map((p) => p.path),
        scripts: bundle.scripts.map((s) => s.path),
        assetsCopied: [],
        issues: validation.issues,
        scriptDiagnostics: validation.scriptDiagnostics,
        dryRun: Boolean(options.dryRun),
      }),
    };
  }

  return {
    ok: true,
    bundle,
    issues: validation.issues,
    scriptDiagnostics: validation.scriptDiagnostics,
    startedAt,
  };
}
