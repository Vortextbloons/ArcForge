import type { ProjectManifest, Scene, Prefab } from "@arcforge/schemas";
import type { ScriptDiagnostic } from "@arcforge/engine/compiler";

export interface ExportOptions {
  /** Absolute path to the game project root (contains project.arcforge.json). */
  projectRoot: string;
  /** Absolute path where export output is written. */
  output: string;
  /** Skip asset optimization (MVP: always a no-op copy). */
  optimize?: boolean;
  /** Include engine source under vendor/ (editable export). Default true. */
  includeEngineSource?: boolean;
  /** Dry-run: validate and report without writing output. */
  dryRun?: boolean;
}

export interface CollectedScript {
  path: string;
  absolutePath: string;
  source: string;
  /** True when directly attached by script.behaviour; false for shared helper modules. */
  entry: boolean;
  /** True for runtime extension modules inside a plugin systems directory. */
  system: boolean;
}

export interface CollectedPrefab {
  path: string;
  prefab: Prefab;
}

export interface CollectedScene {
  path: string;
  scene: Scene;
}

export interface ProjectBundle {
  root: string;
  manifest: ProjectManifest;
  manifestPath: string;
  scenes: CollectedScene[];
  prefabs: CollectedPrefab[];
  scripts: CollectedScript[];
  /** Asset paths relative to project root (e.g. assets/textures/foo.png). */
  referencedAssets: string[];
}

export interface ExportIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  path?: string;
}

export interface BuildReport {
  ok: boolean;
  mode: "web" | "three-project";
  projectName: string;
  output: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  scenes: string[];
  prefabs: string[];
  scripts: string[];
  assetsCopied: string[];
  issues: ExportIssue[];
  scriptDiagnostics: ScriptDiagnostic[];
  dryRun: boolean;
}

export type ExportResult = {
  report: BuildReport;
};
