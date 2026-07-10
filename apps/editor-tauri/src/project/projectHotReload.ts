import { parseScene, type Scene } from "@arcforge/schemas";
import { joinProjectPath } from "./projectModel";
import { tryTauriReadFile } from "./projectIo";

export interface ProjectChangeEvent {
  type: "scene.changed" | "script.changed" | "project.changed";
  paths: string[];
  scene?: string;
  source: "mcp" | "disk";
}

interface DiffLogState {
  entries?: Array<{
    at?: string;
    paths?: string[];
    tool?: string;
  }>;
}

/**
 * Polls MCP diff log + current scene file so the editor can hot-reload
 * when an external AI client writes through MCP (or edits files on disk).
 */
export function startProjectHotReload(options: {
  projectRoot: string;
  sceneRel: string | null;
  onChange: (event: ProjectChangeEvent) => void;
  intervalMs?: number;
}): () => void {
  const { projectRoot, sceneRel, onChange, intervalMs = 750 } = options;
  if (!projectRoot) return () => undefined;

  const diffPath = joinProjectPath(projectRoot, ".threeforge/mcp.diff.json");
  const sceneAbs = sceneRel ? joinProjectPath(projectRoot, sceneRel) : null;

  let lastDiffAt: string | null = null;
  let lastSceneText: string | null = null;
  let cancelled = false;
  let timer: number | null = null;
  let inFlight = false;

  const tick = async () => {
    if (cancelled || inFlight) return;
    inFlight = true;
    try {
      const diffText = await tryTauriReadFile(diffPath);
      if (diffText) {
        try {
          const state = JSON.parse(diffText) as DiffLogState;
          const latest = state.entries?.[0];
          const at = latest?.at ?? null;
          if (at && at !== lastDiffAt) {
            const isFirst = lastDiffAt === null;
            lastDiffAt = at;
            if (!isFirst && latest) {
              const paths = (latest.paths ?? []).map((p) => p.replace(/\\/g, "/"));
              const scenePath =
                paths.find((p) => p.endsWith(".scene.json")) ??
                (sceneRel?.replace(/\\/g, "/") || undefined);
              const hasScript = paths.some((p) => p.startsWith("scripts/") && p.endsWith(".ts"));
              onChange({
                type: hasScript && !scenePath ? "script.changed" : "scene.changed",
                paths,
                scene: scenePath,
                source: "mcp",
              });
            }
          }
        } catch {
          // Ignore malformed diff logs.
        }
      }

      if (sceneAbs) {
        const sceneText = await tryTauriReadFile(sceneAbs);
        if (sceneText != null && sceneText !== lastSceneText) {
          const isFirst = lastSceneText === null;
          lastSceneText = sceneText;
          if (!isFirst) {
            onChange({
              type: "scene.changed",
              paths: [sceneRel!.replace(/\\/g, "/")],
              scene: sceneRel!.replace(/\\/g, "/"),
              source: "disk",
            });
          }
        }
      }
    } finally {
      inFlight = false;
    }
  };

  void tick();
  timer = window.setInterval(() => {
    void tick();
  }, intervalMs);

  return () => {
    cancelled = true;
    if (timer != null) window.clearInterval(timer);
  };
}

export async function readSceneFromDisk(
  projectRoot: string,
  sceneRel: string
): Promise<Scene | null> {
  const abs = joinProjectPath(projectRoot, sceneRel);
  const text = await tryTauriReadFile(abs);
  if (!text) return null;
  try {
    return parseScene(JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

export function sceneRelFromAbsolute(projectRoot: string, scenePath: string | null): string | null {
  if (!scenePath || !projectRoot) return null;
  const root = projectRoot.replace(/[/\\]+$/, "").replace(/\\/g, "/");
  const abs = scenePath.replace(/\\/g, "/");
  if (!abs.toLowerCase().startsWith(root.toLowerCase() + "/")) {
    // Fall back to filename under scenes/
    const parts = abs.split("/");
    const file = parts[parts.length - 1];
    return file.endsWith(".scene.json") ? `scenes/${file}` : null;
  }
  return abs.slice(root.length + 1);
}
