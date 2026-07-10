export interface ScriptDiagnostic {
  file: string;
  message: string;
  severity: "error" | "warning";
  line?: number;
  column?: number;
}

export interface ScriptTypecheckResult {
  ok: boolean;
  diagnostics: ScriptDiagnostic[];
}

export interface ScriptSource {
  path: string;
  source: string;
}

/**
 * Lightweight script validation for MVP (no full tsc host yet).
 * Checks export shape heuristics and basic TypeScript syntax pitfalls.
 * Full project typecheck can replace this later with a worker + typescript API.
 */
export function typecheckScripts(
  scripts: ScriptSource[]
): ScriptTypecheckResult {
  const diagnostics: ScriptDiagnostic[] = [];

  for (const script of scripts) {
    if (!script.path.startsWith("scripts/") || !script.path.endsWith(".ts")) {
      diagnostics.push({
        file: script.path,
        severity: "error",
        message: "Script path must be under scripts/ and end with .ts",
      });
    }

    if (!/\bexport\s+default\s+class\b/.test(script.source)) {
      diagnostics.push({
        file: script.path,
        severity: "error",
        message:
          "Script must `export default class` extending Behaviour",
      });
    }

    if (!/\bextends\s+Behaviour\b/.test(script.source)) {
      diagnostics.push({
        file: script.path,
        severity: "error",
        message: "Default export class must extend Behaviour",
      });
    }

    // Obvious private API imports — scripts must use public API only.
    if (
      /from\s+["']@arcforge\/editor-core["']/.test(script.source) ||
      /from\s+["']@tauri-apps\//.test(script.source) ||
      /from\s+["']node:/.test(script.source)
    ) {
      diagnostics.push({
        file: script.path,
        severity: "error",
        message:
          "Scripts may not import editor, Tauri, or Node APIs",
      });
    }

    const open = (script.source.match(/\{/g) ?? []).length;
    const close = (script.source.match(/\}/g) ?? []).length;
    if (open !== close) {
      diagnostics.push({
        file: script.path,
        severity: "error",
        message: "Unbalanced braces",
      });
    }
  }

  return {
    ok: diagnostics.every((d) => d.severity !== "error"),
    diagnostics,
  };
}
