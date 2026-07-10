export interface McpRuntimeStatus {
  running: boolean;
  url: string | null;
  projectRoot: string | null;
  port: number;
  write: boolean;
  error: string | null;
  logPath: string | null;
  pid: number | null;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export async function startAttachedMcpServer(
  projectRoot: string,
  options: { write?: boolean; port?: number } = {}
): Promise<McpRuntimeStatus> {
  return invoke<McpRuntimeStatus>("start_mcp_server", {
    projectRoot,
    write: options.write ?? false,
    port: options.port ?? 3847,
  });
}

export async function stopAttachedMcpServer(): Promise<McpRuntimeStatus> {
  return invoke<McpRuntimeStatus>("stop_mcp_server");
}

export async function getAttachedMcpStatus(): Promise<McpRuntimeStatus> {
  return invoke<McpRuntimeStatus>("get_mcp_server_status");
}

export async function getAttachedMcpLogs(): Promise<string> {
  return invoke<string>("get_mcp_server_logs");
}

export function idleMcpStatus(): McpRuntimeStatus {
  return {
    running: false,
    url: null,
    projectRoot: null,
    port: 3847,
    write: false,
    error: null,
    logPath: null,
    pid: null,
  };
}
