import { usePlayMode } from "../app/PlayModeContext";

export function ConsolePanel() {
  const { logs, clearLogs, typecheck, runTypecheck } = usePlayMode();
  const errors = logs.filter((l) => l.level === "error").length;

  return (
    <section className="editor__console">
      <div className="panel__header">
        <h2>
          Console
          {errors > 0 ? <span className="console__badge">{errors}</span> : null}
        </h2>
        <div className="toolbar__actions">
          <button type="button" className="btn btn--small" onClick={() => runTypecheck()}>
            Typecheck
          </button>
          <button type="button" className="btn btn--small" onClick={clearLogs}>
            Clear
          </button>
        </div>
      </div>

      {typecheck && (
        <p className={`console__typecheck ${typecheck.ok ? "is-ok" : "is-bad"}`}>
          {typecheck.ok
            ? "Script typecheck passed"
            : `Typecheck failed (${typecheck.diagnostics.length})`}
        </p>
      )}

      <ul className="console__list">
        {logs.length === 0 ? (
          <li className="muted">No messages</li>
        ) : (
          logs.map((entry) => (
            <li key={entry.id} className={`console__entry console__entry--${entry.level}`}>
              <span className="console__level">{entry.level}</span>
              <span className="console__msg">{entry.message}</span>
              {entry.module ? <span className="console__meta">{entry.module}</span> : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
