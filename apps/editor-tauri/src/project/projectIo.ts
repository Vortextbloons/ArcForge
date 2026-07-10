import {
  parseProjectManifest,
  parseScene,
  type ProjectManifest,
  type Scene,
} from "@arcforge/schemas";
import {
  createBlankScene,
  createProjectManifest,
  joinProjectPath,
  projectRootFromManifestPath,
  projectScaffoldFiles,
  rememberRecentProject,
  slugifyProjectName,
} from "./projectModel";

export interface OpenedProject {
  root: string;
  manifestPath: string;
  manifest: ProjectManifest;
  scene: Scene;
  scenePath: string | null;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export async function tryTauriPathExists(path: string): Promise<boolean> {
  try {
    return await invoke<boolean>("path_exists", { path });
  } catch {
    return false;
  }
}

export async function tryTauriCreateDirectory(path: string): Promise<boolean> {
  try {
    await invoke("create_directory", { path });
    return true;
  } catch {
    return false;
  }
}

export async function tryTauriOpenProjectDialog(): Promise<string | null> {
  try {
    return await invoke<string | null>("open_project_dialog");
  } catch {
    return null;
  }
}

export async function tryTauriPickFolderDialog(): Promise<string | null> {
  try {
    return await invoke<string | null>("pick_folder_dialog");
  } catch {
    return null;
  }
}

export async function tryTauriReadFile(path: string): Promise<string | null> {
  try {
    return await invoke<string>("read_project_file", { path });
  } catch {
    return null;
  }
}

export async function tryTauriWriteFile(path: string, contents: string): Promise<boolean> {
  try {
    await invoke("write_project_file", { path, contents });
    return true;
  } catch {
    return false;
  }
}

export async function openProjectFromManifestPath(manifestPath: string): Promise<OpenedProject> {
  const contents = await tryTauriReadFile(manifestPath);
  if (!contents) {
    throw new Error(`Could not read project manifest:\n${manifestPath}`);
  }

  const manifest = parseProjectManifest(JSON.parse(contents) as unknown);
  const root = projectRootFromManifestPath(manifestPath);
  const sceneRel = manifest.defaultScene || "scenes/Main.scene.json";
  const scenePath = joinProjectPath(root, sceneRel);
  const sceneText = await tryTauriReadFile(scenePath);
  if (!sceneText) {
    throw new Error(`Could not read default scene:\n${scenePath}`);
  }

  const scene = parseScene(JSON.parse(sceneText) as unknown);
  rememberRecentProject(manifestPath, manifest.name);
  return { root, manifestPath, manifest, scene, scenePath };
}

export async function createNewProject(
  parentFolder: string,
  projectName: string
): Promise<OpenedProject> {
  const folderName = slugifyProjectName(projectName);
  const root = joinProjectPath(parentFolder, folderName);
  const manifestPath = joinProjectPath(root, "project.arcforge.json");

  if (await tryTauriPathExists(manifestPath)) {
    throw new Error(`A project already exists at:\n${root}`);
  }

  const created = await tryTauriCreateDirectory(root);
  if (!created) {
    throw new Error(`Could not create project folder:\n${root}`);
  }

  for (const file of projectScaffoldFiles(projectName.trim() || "New Game")) {
    const abs = joinProjectPath(root, file.rel);
    const ok = await tryTauriWriteFile(abs, file.contents);
    if (!ok) {
      throw new Error(`Could not write ${file.rel}`);
    }
  }

  return openProjectFromManifestPath(manifestPath);
}

/** In-memory session with no disk project (browser / quick start). */
export function createUntitledSession(): OpenedProject {
  return {
    root: "",
    manifestPath: "",
    manifest: createProjectManifest("Untitled Demo"),
    scene: createBlankScene("Demo"),
    scenePath: null,
  };
}
