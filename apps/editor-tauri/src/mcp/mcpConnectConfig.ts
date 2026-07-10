/** Build copy-paste MCP client config using each editor's native schema. */

export type McpAccessMode = "readonly" | "write";
export type McpEditor = "opencode" | "cursor" | "claude-desktop" | "windsurf" | "vscode";
export type McpTransport = "stdio" | "http";

export interface McpEditorOption {
  id: McpEditor;
  label: string;
  configLocation: string;
}

export const MCP_EDITOR_OPTIONS: readonly McpEditorOption[] = [
  {
    id: "opencode",
    label: "OpenCode",
    configLocation: "opencode.json (project root) or ~/.config/opencode/opencode.json",
  },
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
  nodePath: string;
  arcforgeRoot: string | null;
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

  // Outside the monorepo: do not invent a sibling packages/ path.
  return null;
}

export function inferArcforgeRoot(mcpCliPath: string | null): string | null {
  if (!mcpCliPath) return null;
  const normalized = normalizePath(mcpCliPath);
  const marker = "/packages/mcp-server/dist/cli.js";
  const idx = normalized.toLowerCase().lastIndexOf(marker);
  if (idx === -1) return null;
  return normalized.slice(0, idx);
}

export function defaultNodePath(): string {
  // Absolute path avoids OpenCode Desktop GUI PATH issues on Windows.
  if (typeof navigator !== "undefined" && /win/i.test(navigator.platform)) {
    return "C:/Program Files/nodejs/node.exe";
  }
  return "node";
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
    nodePath: defaultNodePath(),
    arcforgeRoot: inferArcforgeRoot(mcpCliPath),
  };
}

export function buildMcpConfigJson(
  paths: McpConnectPaths,
  mode: McpAccessMode,
  editor: McpEditor,
  transport: McpTransport = editor === "opencode" ? "http" : "stdio"
): { json: string; complete: boolean } {
  const cli = paths.mcpCliPath ?? "C:/path/to/ArcForge/packages/mcp-server/dist/cli.js";
  const project = paths.projectRoot ?? "C:/path/to/YourGame";
  const complete = Boolean(paths.mcpCliPath && paths.projectRoot);
  const accessFlag = mode === "write" ? "--write" : "--readonly";
  const nodeBin = paths.nodePath || "node";

  if (editor === "opencode" && transport === "http") {
    const config = {
      $schema: "https://opencode.ai/config.json",
      mcp: {
        [paths.serverName]: {
          type: "remote",
          url: "http://127.0.0.1:3847/mcp",
          enabled: true,
          timeout: 60_000,
          oauth: false,
        },
      },
    };
    return { json: JSON.stringify(config, null, 2), complete };
  }

  const args = [cli, "--project", project, accessFlag];
  const standardServer = { command: nodeBin, args };

  if (editor === "opencode") {
    const config = {
      $schema: "https://opencode.ai/config.json",
      mcp: {
        [paths.serverName]: {
          type: "local",
          command: [nodeBin, ...args],
          enabled: true,
          timeout: 60_000,
          ...(paths.arcforgeRoot ? { cwd: paths.arcforgeRoot } : {}),
        },
      },
    };
    return { json: JSON.stringify(config, null, 2), complete };
  }

  if (editor === "vscode") {
    return {
      json: JSON.stringify(
        {
          servers: {
            [paths.serverName]: { type: "stdio", ...standardServer },
          },
        },
        null,
        2
      ),
      complete,
    };
  }

  return {
    json: JSON.stringify(
      {
        mcpServers: {
          [paths.serverName]: standardServer,
        },
      },
      null,
      2
    ),
    complete,
  };
}

/** Backwards-compatible default for clients using the common mcpServers schema. */
export function buildMcpServersJson(
  paths: McpConnectPaths,
  mode: McpAccessMode
): { json: string; complete: boolean } {
  return buildMcpConfigJson(paths, mode, "cursor");
}

export function buildMcpCliCommand(
  paths: McpConnectPaths,
  mode: McpAccessMode,
  transport: McpTransport = "stdio"
): string {
  const cli = paths.mcpCliPath ?? "<ArcForge>/packages/mcp-server/dist/cli.js";
  const project = paths.projectRoot ?? "<YourGame>";
  const flag = mode === "write" ? "--write" : "--readonly";
  const nodeBin = paths.nodePath.includes(" ") ? `"${paths.nodePath}"` : paths.nodePath;
  if (transport === "http") {
    return `${nodeBin} "${cli}" --project "${project}" ${flag} --http --port 3847`;
  }
  return `${nodeBin} "${cli}" --project "${project}" ${flag}`;
}
