import { parseScene, type Scene } from "@arcforge/schemas";
import { joinProjectPath } from "./projectModel";
import { tryTauriReadFile } from "./projectIo";

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export async function loadProjectScenes(projectRoot: string): Promise<{
  scenes: Record<string, Scene>;
  errors: string[];
}> {
  const scenes: Record<string, Scene> = {};
  const errors: string[] = [];
  if (!projectRoot) return { scenes, errors };
  let paths: string[];
  try {
    paths = await invoke<string[]>("list_project_files", {
      projectRoot,
      relativeDir: "scenes",
      extension: ".scene.json",
    });
  } catch (error) {
    return { scenes, errors: [error instanceof Error ? error.message : String(error)] };
  }
  for (const rawPath of paths) {
    const path = rawPath.replace(/\\/g, "/");
    const text = await tryTauriReadFile(joinProjectPath(projectRoot, path));
    if (text == null) {
      errors.push(`Could not read scene: ${path}`);
      continue;
    }
    try {
      scenes[path] = parseScene(JSON.parse(text) as unknown);
    } catch (error) {
      errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { scenes, errors };
}
