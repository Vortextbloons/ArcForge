import { parsePrefab, type Prefab } from "@arcforge/schemas";
import { joinProjectPath } from "./projectModel";
import { tryTauriReadFile } from "./projectIo";

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export async function loadProjectPrefabs(projectRoot: string): Promise<{
  prefabs: Record<string, Prefab>;
  errors: string[];
}> {
  const prefabs: Record<string, Prefab> = {};
  const errors: string[] = [];
  if (!projectRoot) return { prefabs, errors };

  let paths: string[] = [];
  try {
    paths = await invoke<string[]>("list_project_files", {
      projectRoot,
      relativeDir: "prefabs",
      extension: ".prefab.json",
    });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { prefabs, errors };
  }

  for (const rawPath of paths) {
    const path = rawPath.replace(/\\/g, "/");
    const text = await tryTauriReadFile(joinProjectPath(projectRoot, path));
    if (text == null) {
      errors.push(`Could not read prefab: ${path}`);
      continue;
    }
    try {
      prefabs[path] = parsePrefab(JSON.parse(text) as unknown);
    } catch (error) {
      errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { prefabs, errors };
}
