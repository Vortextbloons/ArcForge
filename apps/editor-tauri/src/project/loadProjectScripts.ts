import type { BehaviourConstructor, RuntimeSystem } from "@arcforge/engine";
import type { ScriptSource } from "@arcforge/engine/compiler";
import { joinProjectPath } from "./projectModel";
import { tryTauriReadFile } from "./projectIo";

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export async function listProjectScriptPaths(projectRoot: string): Promise<string[]> {
  if (!projectRoot) return [];
  try {
    const files = await invoke<string[]>("list_project_files", {
      projectRoot,
      relativeDir: "scripts",
      extension: ".ts",
    });
    return files
      .map((f) => f.replace(/\\/g, "/"))
      .filter((f) => f.startsWith("scripts/") && f.endsWith(".ts"))
      .sort();
  } catch {
    return [];
  }
}

export async function listProjectRuntimeSystemPaths(projectRoot: string): Promise<string[]> {
  if (!projectRoot) return [];
  try {
    const files = await invoke<string[]>("list_project_files", {
      projectRoot,
      relativeDir: "plugins",
      extension: ".system.ts",
    });
    return files
      .map((file) => file.replace(/\\/g, "/"))
      .filter((file) => /^plugins\/[^/]+\/systems\/.+\.system\.ts$/.test(file))
      .sort();
  } catch {
    return [];
  }
}

export async function readProjectScriptSources(
  projectRoot: string,
  paths?: string[]
): Promise<ScriptSource[]> {
  const scriptPaths = paths ?? (await listProjectScriptPaths(projectRoot));
  const sources: ScriptSource[] = [];
  for (const rel of scriptPaths) {
    const abs = joinProjectPath(projectRoot, rel);
    const text = await tryTauriReadFile(abs);
    if (text == null) continue;
    sources.push({ path: rel.replace(/\\/g, "/"), source: text });
  }
  return sources;
}

export interface LoadedProjectScripts {
  modules: Record<string, BehaviourConstructor>;
  sources: ScriptSource[];
  errors: string[];
  systems: RuntimeSystem[];
}

/** Read, typecheck (lightweight), and compile all project Behaviour scripts. */
export async function loadProjectBehaviourScripts(
  projectRoot: string
): Promise<LoadedProjectScripts> {
  const paths = [
    ...(await listProjectScriptPaths(projectRoot)),
    ...(await listProjectRuntimeSystemPaths(projectRoot)),
  ];
  const sources = await readProjectScriptSources(projectRoot, paths);
  const errors: string[] = [];
  const modules: Record<string, BehaviourConstructor> = {};

  if (sources.length === 0) {
    return { modules, systems: [], sources, errors };
  }

  const { compileBehaviourModules, typecheckScripts } = await import("@arcforge/engine/compiler");

  const typecheck = typecheckScripts(sources);
  for (const diag of typecheck.diagnostics) {
    if (diag.severity === "error") {
      errors.push(`${diag.file}: ${diag.message}`);
    }
  }

  const compiled = compileBehaviourModules(sources);
  errors.push(...compiled.diagnostics);
  Object.assign(modules, compiled.modules);

  return { modules, systems: compiled.systems, sources, errors };
}
