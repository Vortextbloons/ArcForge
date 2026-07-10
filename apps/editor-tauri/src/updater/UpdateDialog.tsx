import { useUpdater } from "./useUpdater";

interface UpdateDialogProps {
  updater: ReturnType<typeof useUpdater>;
}

export function UpdateDialog({ updater }: UpdateDialogProps) {
  const { status, info, downloaded, contentLength, error, downloadAndInstall, restart, dismiss } =
    updater;

  if (status === "idle" || status === "checking" || status === "none" || status === "error") {
    return null;
  }

  const progress = contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0;

  return (
    <div className="modal-backdrop" onClick={dismiss}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>
            {status === "available" && "Update Available"}
            {status === "downloading" && "Downloading Update"}
            {status === "ready" && "Update Ready"}
          </h2>
          <button className="btn btn--small" onClick={dismiss}>
            Close
          </button>
        </div>

        <div className="modal__body">
          {status === "available" && info && (
            <>
              <p className="modal__lead">
                A new version of ArcForge is available: <strong>{info.version}</strong>
              </p>
              {info.date && (
                <p className="muted">Released: {new Date(info.date).toLocaleDateString()}</p>
              )}
              {info.body && (
                <div className="modal__section">
                  <h3>Release Notes</h3>
                  <pre className="modal__code">{info.body}</pre>
                </div>
              )}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button className="btn btn--play" onClick={downloadAndInstall}>
                  Download & Install
                </button>
                <button className="btn" onClick={dismiss}>
                  Skip
                </button>
              </div>
            </>
          )}

          {status === "downloading" && (
            <>
              <p className="modal__lead">Downloading update{info ? ` v${info.version}` : ""}...</p>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  borderRadius: "4px",
                  background: "var(--panel-2)",
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                  marginTop: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, var(--accent), var(--arc))",
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
              <p className="muted" style={{ marginTop: "0.5rem" }}>
                {contentLength > 0
                  ? `${(downloaded / 1024 / 1024).toFixed(1)} MB / ${(contentLength / 1024 / 1024).toFixed(1)} MB (${progress}%)`
                  : "Preparing download..."}
              </p>
            </>
          )}

          {status === "ready" && (
            <>
              <p className="modal__lead">
                Update installed successfully. Restart to apply changes.
              </p>
              <div className="modal__hint modal__hint--ok">
                The app will restart to complete the update.
              </div>
              <button className="btn btn--play" onClick={restart} style={{ marginTop: "0.5rem" }}>
                Restart Now
              </button>
            </>
          )}

          {error && (
            <div className="start__error" style={{ marginTop: "0.75rem" }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
