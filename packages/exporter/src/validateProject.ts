import { typecheckScripts } from "@arcforge/engine/compiler";
import type { ExportIssue, ProjectBundle } from "./types.js";
import { issue } from "./fsUtils.js";

export interface ValidationResult {
  ok: boolean;
  issues: ExportIssue[];
  scriptDiagnostics: ReturnType<typeof typecheckScripts>["diagnostics"];
}

/**
 * Validate scenes/prefabs already loaded, typecheck scripts, check asset refs.
 */
export function validateProjectBundle(
  bundle: ProjectBundle,
  priorIssues: ExportIssue[] = []
): ValidationResult {
  const issues = [...priorIssues];

  for (const scene of bundle.scenes) {
    const ids = new Set<string>();
    for (const entity of scene.scene.entities) {
      if (ids.has(entity.id)) {
        issues.push(
          issue("error", "duplicate-entity", `Duplicate entity id "${entity.id}"`, scene.path)
        );
      }
      ids.add(entity.id);
    }
    for (const entity of scene.scene.entities) {
      if (entity.parent && !ids.has(entity.parent)) {
        issues.push(
          issue(
            "error",
            "missing-parent",
            `Entity "${entity.id}" parent "${entity.parent}" not found`,
            scene.path
          )
        );
      }
    }
  }

  const typecheck = typecheckScripts(
    bundle.scripts.map((s) => ({ path: s.path, source: s.source }))
  );

  for (const diag of typecheck.diagnostics) {
    issues.push(issue(diag.severity, "script-typecheck", diag.message, diag.file));
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  return {
    ok: !hasErrors && typecheck.ok,
    issues,
    scriptDiagnostics: typecheck.diagnostics,
  };
}
