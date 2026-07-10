import type { ProjectManifest, Scene } from "@arcforge/schemas";

export interface RecentProject {
  path: string;
  name: string;
  openedAt: number;
}

const RECENT_KEY = "arcforge.recentProjects";
const MAX_RECENT = 8;

export function loadRecentProjects(): RecentProject[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentProject =>
          !!item &&
          typeof item === "object" &&
          typeof (item as RecentProject).path === "string" &&
          typeof (item as RecentProject).name === "string"
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function rememberRecentProject(path: string, name: string): RecentProject[] {
  const next: RecentProject[] = [
    { path, name, openedAt: Date.now() },
    ...loadRecentProjects().filter((p) => p.path !== path),
  ].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}

export function removeRecentProject(path: string): RecentProject[] {
  const next = loadRecentProjects().filter((p) => p.path !== path);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}

export function joinProjectPath(root: string, rel: string): string {
  const base = root.replace(/[/\\]+$/, "");
  const parts = rel.replace(/\\/g, "/").split("/").filter(Boolean);
  const sep = root.includes("\\") && !root.includes("/") ? "\\" : "/";
  return [base, ...parts].join(sep);
}

export function projectRootFromManifestPath(manifestPath: string): string {
  const normalized = manifestPath.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return manifestPath;
  // Preserve original separators when possible
  return manifestPath.slice(0, idx);
}

export function slugifyProjectName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "new-game";
}

export function createBlankScene(name = "Main"): Scene {
  return {
    version: 1,
    name,
    entities: [
      {
        id: "camera",
        name: "Main Camera",
        parent: null,
        components: {
          "core.transform": {
            position: [4, 3, 6],
            rotation: [-0.4, 0.5, 0],
            scale: [1, 1, 1],
          },
          "render.camera": {
            fov: 60,
            near: 0.1,
            far: 1000,
            primary: true,
          },
        },
      },
      {
        id: "sun",
        name: "Sun",
        parent: null,
        components: {
          "core.transform": {
            position: [2, 6, 2],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          "render.light": {
            type: "directional",
            color: "#ffffff",
            intensity: 1.2,
            castShadow: true,
            direction: [-0.4, -1, -0.3],
          },
        },
      },
      {
        id: "ambient",
        name: "Ambient",
        parent: null,
        components: {
          "core.transform": {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          "render.light": {
            type: "ambient",
            color: "#8899aa",
            intensity: 0.35,
            castShadow: false,
            direction: [0, -1, 0],
          },
        },
      },
      {
        id: "ground",
        name: "Ground",
        parent: null,
        components: {
          "core.transform": {
            position: [0, -0.5, 0],
            rotation: [0, 0, 0],
            scale: [12, 1, 12],
          },
          "render.mesh": {
            primitive: "box",
            color: "#3d4a5c",
            castShadow: false,
            receiveShadow: true,
          },
        },
      },
    ],
  };
}

export function createProjectManifest(name: string): ProjectManifest {
  return {
    name,
    engineVersion: "0.1.0",
    defaultScene: "scenes/Main.scene.json",
    render: {
      backend: "webgl",
      antialias: true,
      shadows: true,
      toneMapping: "aces",
    },
    physics: {
      enabled: false,
      backend: "none",
    },
    scripting: {
      language: "typescript",
      strict: true,
    },
    export: {
      web: true,
      editableThreeProject: true,
    },
  };
}

export function projectScaffoldFiles(
  name: string
): Array<{ rel: string; contents: string }> {
  const manifest = createProjectManifest(name);
  const scene = createBlankScene("Main");
  return [
    {
      rel: "project.arcforge.json",
      contents: `${JSON.stringify(manifest, null, 2)}\n`,
    },
    {
      rel: "scenes/Main.scene.json",
      contents: `${JSON.stringify(scene, null, 2)}\n`,
    },
    {
      rel: "assets/.gitkeep",
      contents: "",
    },
    {
      rel: "scripts/.gitkeep",
      contents: "",
    },
    {
      rel: "prefabs/.gitkeep",
      contents: "",
    },
    {
      rel: "docs/PROJECT_CONVENTIONS.md",
      contents: `# ${name} conventions\n\n- Keep scripts small and focused.\n- Prefer schema-driven components over one-off hacks.\n- Use MCP docs tools before large AI edits.\n`,
    },
    {
      rel: "docs/GAME_DESIGN.md",
      contents: `# ${name}\n\nDescribe the game fantasy, core loop, and win/lose conditions here.\n`,
    },
    {
      rel: ".threeforge/mcp.policy.json",
      contents: `${JSON.stringify(
        {
          mcp: {
            enabled: true,
            defaultMode: "ask",
            allowedTools: {
              "project.read": "allow",
              "docs.read": "allow",
              "docs.search": "allow",
              "scene.read": "allow",
              "scene.write": "ask",
              "prefab.read": "allow",
              "prefab.write": "ask",
              "script.read": "allow",
              "script.write": "ask",
              "asset.import": "ask",
              "build.preview": "allow",
              "build.export": "ask",
              "dependency.install": "deny",
              "shell.run": "deny",
              "engine.modify": "deny",
            },
          },
        },
        null,
        2
      )}\n`,
    },
  ];
}
