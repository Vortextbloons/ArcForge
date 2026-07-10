import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildMcpCliCommand,
  buildMcpConfigJson,
  MCP_EDITOR_OPTIONS,
  resolveMcpConnectPaths,
  type McpAccessMode,
  type McpEditor,
  type McpTransport,
} from "./mcpConnectConfig";
import { getAttachedMcpLogs, type McpRuntimeStatus } from "./mcpRuntime";

interface ConnectMcpDialogProps {
  open: boolean;
  onClose: () => void;
  scenePath: string | null;
  sceneName: string;
  projectRoot?: string | null;
  mcpStatus?: McpRuntimeStatus;
  onRestartMcp?: (write?: boolean) => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

export function ConnectMcpDialog({
  open,
  onClose,
  scenePath,
  sceneName,
  projectRoot = null,
  mcpStatus,
  onRestartMcp,
}: ConnectMcpDialogProps) {
  const [mode, setMode] = useState<McpAccessMode>("write");
  const [editor, setEditor] = useState<McpEditor>("opencode");
  const [transport, setTransport] = useState<McpTransport>("http");
  const [copied, setCopied] = useState<"json" | "cli" | "logs" | null>(null);
  const [logs, setLogs] = useState("");
  const [logsBusy, setLogsBusy] = useState(false);

  const paths = useMemo(
    () => resolveMcpConnectPaths(scenePath, sceneName, projectRoot),
    [scenePath, sceneName, projectRoot]
  );

  const effectiveTransport: McpTransport = editor === "opencode" ? transport : "stdio";

  const { json, complete } = useMemo(
    () => buildMcpConfigJson(paths, mode, editor, effectiveTransport),
    [paths, mode, editor, effectiveTransport]
  );
  const cliCommand = useMemo(
    () => buildMcpCliCommand(paths, mode, effectiveTransport),
    [paths, mode, effectiveTransport]
  );
  const editorOption = MCP_EDITOR_OPTIONS.find((option) => option.id === editor)!;
  const attached = Boolean(mcpStatus?.running);

  const refreshLogs = useCallback(async () => {
    setLogsBusy(true);
    try {
      setLogs(await getAttachedMcpLogs());
    } catch (error) {
      setLogs(error instanceof Error ? error.message : String(error));
    } finally {
      setLogsBusy(false);
    }
  }, []);

  useEffect(() => {
    if (editor === "opencode") setTransport("http");
  }, [editor]);

  // Keep the attached sidecar access mode in sync with the dialog selection.
  useEffect(() => {
    if (!open || !onRestartMcp || !projectRoot || !mcpStatus?.running) return;
    const wantWrite = mode === "write";
    if (mcpStatus.write === wantWrite) return;
    onRestartMcp(wantWrite);
  }, [mode, open, onRestartMcp, projectRoot, mcpStatus?.running, mcpStatus?.write]);

  useEffect(() => {
    if (!open) return;
    void refreshLogs();
    const id = window.setInterval(() => void refreshLogs(), 2500);
    return () => window.clearInterval(id);
  }, [open, refreshLogs, mcpStatus?.running, mcpStatus?.error]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(null), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);

  const handleCopyJson = useCallback(async () => {
    const ok = await copyText(json);
    if (ok) setCopied("json");
  }, [json]);

  const handleCopyCli = useCallback(async () => {
    const ok = await copyText(cliCommand);
    if (ok) setCopied("cli");
  }, [cliCommand]);

  const handleCopyLogs = useCallback(async () => {
    const ok = await copyText(logs);
    if (ok) setCopied("logs");
  }, [logs]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-mcp-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id="connect-mcp-title">Connect MCP</h2>
          <button type="button" className="btn btn--small" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>

        <div className="modal__body">
          <p className="modal__lead">
            Copy this config into your AI IDE so it can talk to this ArcForge project through MCP.
          </p>

          {mcpStatus && (
            <p className={`modal__hint ${attached ? "modal__hint--ok" : ""}`}>
              {attached ? (
                <>
                  MCP is running at <code>{mcpStatus.url}</code>
                  {mcpStatus.pid ? <> (pid {mcpStatus.pid})</> : null}. Stops when you close ArcForge
                  or go Home.
                  {mcpStatus.logPath ? (
                    <>
                      {" "}
                      Log: <code>{mcpStatus.logPath}</code>
                    </>
                  ) : null}
                </>
              ) : mcpStatus.error ? (
                <>
                  MCP failed to start: {mcpStatus.error}
                  {onRestartMcp && projectRoot ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        className="btn btn--small"
                        onClick={() => onRestartMcp(mode === "write")}
                      >
                        Retry
                      </button>
                    </>
                  ) : null}
                </>
              ) : projectRoot ? (
                "MCP starts automatically when a project is open."
              ) : (
                "Open a disk project to auto-start the attached MCP server."
              )}
            </p>
          )}

          <div className="modal__section">
            <div className="modal__section-head">
              <h3>MCP sidecar logs</h3>
              <div className="toolbar__actions">
                <button
                  type="button"
                  className="btn btn--small"
                  disabled={logsBusy}
                  onClick={() => void refreshLogs()}
                >
                  {logsBusy ? "Refreshing…" : "Refresh"}
                </button>
                <button type="button" className="btn btn--small" onClick={() => void handleCopyLogs()}>
                  {copied === "logs" ? "Copied" : "Copy logs"}
                </button>
              </div>
            </div>
            <pre className="modal__code modal__code--logs">{logs || "No logs yet."}</pre>
          </div>

          {!complete && (
            <p className="modal__hint">
              Open a project from disk so paths can be filled in, or replace the placeholders below.
            </p>
          )}

          <div className="modal__row modal__row--config">
            <label className="field field--inline">
              <span>Editor</span>
              <select value={editor} onChange={(e) => setEditor(e.target.value as McpEditor)}>
                {MCP_EDITOR_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--inline">
              <span>Access</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as McpAccessMode)}>
                <option value="readonly">Read-only</option>
                <option value="write">Write (mutations)</option>
              </select>
            </label>
            {editor === "opencode" && (
              <label className="field field--inline">
                <span>Transport</span>
                <select
                  value={transport}
                  onChange={(e) => setTransport(e.target.value as McpTransport)}
                >
                  <option value="http">HTTP (recommended on Windows)</option>
                  <option value="stdio">Local stdio</option>
                </select>
              </label>
            )}
          </div>

          {editor === "opencode" && effectiveTransport === "http" ? (
            <ol className="modal__steps">
              <li>
                Build once (if needed): <code>pnpm --filter @arcforge/mcp-server build</code>
              </li>
              <li>
                {attached
                  ? "ArcForge already started the HTTP MCP server for this project."
                  : "Open a project in ArcForge so it can start the HTTP MCP server."}
              </li>
              <li>
                Put the JSON below in your game project&apos;s <code>opencode.json</code>.
              </li>
              <li>Reload OpenCode — point it at the remote URL while ArcForge is open.</li>
            </ol>
          ) : (
            <ol className="modal__steps">
              <li>
                Build the MCP server once:{" "}
                <code>pnpm --filter @arcforge/mcp-server build</code>
              </li>
              <li>
                Merge the JSON below into <code>{editorOption.configLocation}</code>.
              </li>
              <li>Restart the IDE MCP client / reload MCP servers.</li>
              <li>
                Ask the AI to call <code>docs.get_relevant</code> before editing.
              </li>
            </ol>
          )}

          <div className="modal__section">
            <div className="modal__section-head">
              <h3>{editorOption.label} MCP config</h3>
              <button type="button" className="btn btn--small" onClick={() => void handleCopyJson()}>
                {copied === "json" ? "Copied" : "Copy JSON"}
              </button>
            </div>
            <pre className="modal__code">{json}</pre>
          </div>

          {!(editor === "opencode" && effectiveTransport === "http" && attached) && (
            <div className="modal__section">
              <div className="modal__section-head">
                <h3>CLI (optional)</h3>
                <button type="button" className="btn btn--small" onClick={() => void handleCopyCli()}>
                  {copied === "cli" ? "Copied" : "Copy command"}
                </button>
              </div>
              <pre className="modal__code">{cliCommand}</pre>
            </div>
          )}

          {editor === "opencode" && effectiveTransport === "http" && (
            <p className="muted modal__foot">
              OpenCode Desktop on Windows often fails local stdio MCPs. Use HTTP remote mode and keep
              ArcForge open so the attached server stays up.
            </p>
          )}

          {editor === "opencode" && effectiveTransport === "stdio" && (
            <p className="muted modal__foot">
              Stdio may stay red on OpenCode Desktop for Windows. Prefer HTTP transport.
            </p>
          )}

          {editor !== "opencode" && (
            <p className="muted modal__foot">
              Save this configuration to <code>{editorOption.configLocation}</code>, then reload the
              editor&apos;s MCP servers.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
