/** Build copy-paste MCP client config using each editor's native schema. */

export type McpAccessMode = "readonly" | "write";
export type McpEditor = "opencode" | "cursor" | "claude-desktop" | "windsurf" | "vscode";

export interface McpEditorOption {
  id: McpEditor;
  label: string;
  configLocation: string;
}

export const MCP_EDITOR_OPTIONS: readonly McpEditorOption[] = [
  { id: "opencode", label: "OpenCode", configLocation: "~/.config/opencode/opencode.json" },
  { id: "cursor", label: "Cursor", configLocation: ".cursor/mcp.json" },
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    configLocation: "claude_desktop_config.json",
  },
  { id: "windsurf", label: "Windsurf", configLocation: "~/.codeium/windsurf/mcp_config.json" },
  { id: "vscode", label: "VS Code", configLocation: ".vscode/mcp.json" },
];

export interface McpConnectPaths {
  projectRoot: string | null;
  mcpCliPath: string | null;
  serverName: string;
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

/** Infer game project root from an open scene path (`.../scenes/Foo.scene.json`). */
export function inferProjectRoot(scenePath: string | null): string | null {
  if (!scenePath) return null;
  const normalized = normalizePath(scenePath);
  // Browser file picks often only give a filename.
  if (!normalized.includes("/")) return null;

  const scenesMarker = "/scenes/";
  const idx = normalized.toLowerCase().lastIndexOf(scenesMarker);
  if (idx !== -1) {
    return normalized.slice(0, idx);
  }

  // Fallback: parent of the scene file's directory.
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) return null;
  const parent = normalized.slice(0, lastSlash);
  const parentSlash = parent.lastIndexOf("/");
  if (parentSlash <= 0) return null;
  return parent.slice(0, parentSlash);
}

/**
 * Infer ArcForge monorepo MCP CLI path from a project under `examples/`
 * or a sibling layout. Returns null when unknown so the UI can show placeholders.
 */
export function inferMcpCliPath(projectRoot: string | null): string | null {
  if (!projectRoot) return null;
  const normalized = normalizePath(projectRoot);
  const lower = normalized.toLowerCase();

  const examplesIdx = lower.lastIndexOf("/examples/");
  if (examplesIdx !== -1) {
    return `${normalized.slice(0, examplesIdx)}/packages/mcp-server/dist/cli.js`;
  }

  // Sibling layout: <repo>/packages/mcp-server next to <repo>/<game>
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) return null;
  return `${normalized.slice(0, lastSlash)}/packages/mcp-server/dist/cli.js`;
}

export function serverNameFromProject(projectRoot: string | null, sceneName: string): string {
  if (projectRoot) {
    const base = normalizePath(projectRoot).split("/").pop() || "project";
    return `arcforge-${base.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}`;
  }
  const safe = sceneName.toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "project";
  return `arcforge-${safe}`;
}

export function resolveMcpConnectPaths(
  scenePath: string | null,
  sceneName: string,
  projectRootOverride?: string | null
): McpConnectPaths {
  const projectRoot =
    (projectRootOverride && projectRootOverride.trim()) || inferProjectRoot(scenePath);
  const mcpCliPath = inferMcpCliPath(projectRoot);
  return {
    projectRoot,
    mcpCliPath,
    serverName: serverNameFromProject(projectRoot, sceneName),
  };
}

export function buildMcpConfigJson(
  paths: McpConnectPaths,
  mode: McpAccessMode,
  editor: McpEditor
): { json: string; complete: boolean } {
  const cli = paths.mcpCliPath ?? "C:/path/to/ArcForge/packages/mcp-server/dist/cli.js";
  const project = paths.projectRoot ?? "C:/path/to/YourGame";
  const complete = Boolean(paths.mcpCliPath && paths.projectRoot);

  const args = [cli, "--project", project, mode === "write" ? "--write" : "--readonly"];
  const standardServer = { command: "node", args };
  const config =
    editor === "opencode"
      ? {
          $schema: "https://opencode.ai/config.json",
          mcp: {
            [paths.serverName]: {
              type: "local",
              command: ["node", ...args],
              enabled: false,
            },
          },
        }
      : editor === "vscode"
        ? {
            servers: {
              [paths.serverName]: { type: "stdio", ...standardServer },
            },
          }
        : {
            mcpServers: {
              [paths.serverName]: standardServer,
            },
          };

  return { json: JSON.stringify(config, null, 2), complete };
}

/** Backwards-compatible default for clients using the common mcpServers schema. */
export function buildMcpServersJson(
  paths: McpConnectPaths,
  mode: McpAccessMode
): { json: string; complete: boolean } {
  return buildMcpConfigJson(paths, mode, "cursor");
}

export function buildMcpCliCommand(paths: McpConnectPaths, mode: McpAccessMode): string {
  const cli = paths.mcpCliPath ?? "<ArcForge>/packages/mcp-server/dist/cli.js";
  const project = paths.projectRoot ?? "<YourGame>";
  const flag = mode === "write" ? "--write" : "--readonly";
  return `node "${cli}" --project "${project}" ${flag}`;
}
