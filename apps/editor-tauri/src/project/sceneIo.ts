import { parseScene } from "@arcforge/schemas";

export function downloadSceneJson(scene: unknown, filename: string): void {
  const text = JSON.stringify(scene, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function openSceneFile(): Promise<{ path: string; scene: unknown }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.scene.json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text) as unknown;
        resolve({ path: file.name, scene: parseScene(data) });
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}

export async function tryTauriReadFile(path: string): Promise<string | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("read_project_file", { path });
  } catch {
    return null;
  }
}

export async function tryTauriWriteFile(path: string, contents: string): Promise<boolean> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("write_project_file", { path, contents });
    return true;
  } catch {
    return false;
  }
}

export async function tryTauriOpenSceneDialog(): Promise<string | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string | null>("open_scene_dialog");
  } catch {
    return null;
  }
}

export async function tryTauriSaveSceneDialog(defaultName: string): Promise<string | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string | null>("save_scene_dialog", { defaultName });
  } catch {
    return null;
  }
}
