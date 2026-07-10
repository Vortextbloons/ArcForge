/** Build copy-paste MCP client config for AI IDEs (Cursor, Claude, etc.). */

export type McpAccessMode = "readonly" | "write";

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
  sceneName: string
): McpConnectPaths {
  const projectRoot = inferProjectRoot(scenePath);
  const mcpCliPath = inferMcpCliPath(projectRoot);
  return {
    projectRoot,
    mcpCliPath,
    serverName: serverNameFromProject(projectRoot, sceneName),
  };
}

export function buildMcpServersJson(
  paths: McpConnectPaths,
  mode: McpAccessMode
): { json: string; complete: boolean } {
  const cli = paths.mcpCliPath ?? "C:/path/to/ArcForge/packages/mcp-server/dist/cli.js";
  const project = paths.projectRoot ?? "C:/path/to/YourGame";
  const complete = Boolean(paths.mcpCliPath && paths.projectRoot);

  const config = {
    mcpServers: {
      [paths.serverName]: {
        command: "node",
        args: [cli, "--project", project, mode === "write" ? "--write" : "--readonly"],
      },
    },
  };

  return { json: JSON.stringify(config, null, 2), complete };
}

export function buildMcpCliCommand(paths: McpConnectPaths, mode: McpAccessMode): string {
  const cli = paths.mcpCliPath ?? "<ArcForge>/packages/mcp-server/dist/cli.js";
  const project = paths.projectRoot ?? "<YourGame>";
  const flag = mode === "write" ? "--write" : "--readonly";
  return `node "${cli}" --project "${project}" ${flag}`;
}
