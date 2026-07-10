import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildMcpCliCommand,
  buildMcpServersJson,
  resolveMcpConnectPaths,
  type McpAccessMode,
} from "./mcpConnectConfig";

interface ConnectMcpDialogProps {
  open: boolean;
  onClose: () => void;
  scenePath: string | null;
  sceneName: string;
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

export function ConnectMcpDialog({ open, onClose, scenePath, sceneName }: ConnectMcpDialogProps) {
  const [mode, setMode] = useState<McpAccessMode>("readonly");
  const [copied, setCopied] = useState<"json" | "cli" | null>(null);

  const paths = useMemo(
    () => resolveMcpConnectPaths(scenePath, sceneName),
    [scenePath, sceneName]
  );

  const { json, complete } = useMemo(() => buildMcpServersJson(paths, mode), [paths, mode]);
  const cliCommand = useMemo(() => buildMcpCliCommand(paths, mode), [paths, mode]);

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
            Copy this config into your AI IDE (Cursor, Claude Desktop, Windsurf, etc.) so it can
            talk to this ArcForge project through MCP.
          </p>

          {!complete && (
            <p className="modal__hint">
              Open a scene from disk (File → Open) so paths can be filled in, or replace the
              placeholders below with your ArcForge and project folders.
            </p>
          )}

          <div className="modal__row">
            <label className="field field--inline">
              <span>Access</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as McpAccessMode)}
              >
                <option value="readonly">Read-only</option>
                <option value="write">Write (mutations)</option>
              </select>
            </label>
          </div>

          <ol className="modal__steps">
            <li>
              Build the MCP server once:{" "}
              <code>pnpm --filter @arcforge/mcp-server build</code>
            </li>
            <li>Copy the JSON below into your IDE&apos;s MCP settings.</li>
            <li>Restart the IDE MCP client / reload MCP servers.</li>
            <li>
              Ask the AI to call <code>docs.get_relevant</code> before editing.
            </li>
          </ol>

          <div className="modal__section">
            <div className="modal__section-head">
              <h3>IDE MCP config</h3>
              <button type="button" className="btn btn--small" onClick={() => void handleCopyJson()}>
                {copied === "json" ? "Copied" : "Copy JSON"}
              </button>
            </div>
            <pre className="modal__code">{json}</pre>
          </div>

          <div className="modal__section">
            <div className="modal__section-head">
              <h3>CLI (optional)</h3>
              <button type="button" className="btn btn--small" onClick={() => void handleCopyCli()}>
                {copied === "cli" ? "Copied" : "Copy command"}
              </button>
            </div>
            <pre className="modal__code">{cliCommand}</pre>
          </div>

          <p className="muted modal__foot">
            Cursor: Settings → MCP → add server, or merge into{" "}
            <code>.cursor/mcp.json</code>. Claude Desktop: merge into{" "}
            <code>claude_desktop_config.json</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
