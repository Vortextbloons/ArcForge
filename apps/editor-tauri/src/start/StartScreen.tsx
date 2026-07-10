import { useCallback, useEffect, useState } from "react";
import {
  createNewProject,
  createUntitledSession,
  openProjectFromManifestPath,
  tryTauriOpenProjectDialog,
  tryTauriPickFolderDialog,
} from "../project/projectIo";
import {
  loadRecentProjects,
  removeRecentProject,
  type RecentProject,
} from "../project/projectModel";
import { useProjectSession } from "../app/ProjectSession";

type Panel = "home" | "new";

export function StartScreen() {
  const { openProject } = useProjectSession();
  const [panel, setPanel] = useState<Panel>("home");
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [projectName, setProjectName] = useState("My Game");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRecent(loadRecentProjects());
  }, []);

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const handleOpenProject = useCallback(() => {
    void run(async () => {
      const path = await tryTauriOpenProjectDialog();
      if (!path) {
        setError(
          "No project selected. Choose a project.arcforge.json file (Tauri desktop build required for folder dialogs)."
        );
        return;
      }
      const opened = await openProjectFromManifestPath(path);
      openProject(opened);
      setRecent(loadRecentProjects());
    });
  }, [openProject, run]);

  const handleOpenRecent = useCallback(
    (item: RecentProject) => {
      void run(async () => {
        try {
          const opened = await openProjectFromManifestPath(item.path);
          openProject(opened);
          setRecent(loadRecentProjects());
        } catch (err) {
          setRecent(removeRecentProject(item.path));
          throw err;
        }
      });
    },
    [openProject, run]
  );

  const handleCreate = useCallback(() => {
    void run(async () => {
      const parent = await tryTauriPickFolderDialog();
      if (!parent) {
        setError("Pick a parent folder to create the project in.");
        return;
      }
      const opened = await createNewProject(parent, projectName);
      openProject(opened);
      setRecent(loadRecentProjects());
    });
  }, [openProject, projectName, run]);

  const handleUntitled = useCallback(() => {
    setError(null);
    openProject(createUntitledSession());
  }, [openProject]);

  return (
    <div className="start">
      <div className="start__glow" aria-hidden />
      <div className="start__shell">
        <header className="start__brand">
          <p className="start__eyebrow">Desktop game editor</p>
          <h1>ArcForge</h1>
          <p className="start__tagline">
            Create shippable Three.js games with a modular editor, runtime, and MCP.
          </p>
        </header>

        {error && (
          <p className="start__error" role="alert">
            {error}
          </p>
        )}

        {panel === "home" ? (
          <div className="start__grid">
            <section className="start__actions">
              <button
                type="button"
                className="start__action start__action--primary"
                disabled={busy}
                onClick={() => setPanel("new")}
              >
                <span className="start__action-title">New Project</span>
                <span className="start__action-desc">
                  Scaffold scenes, scripts, assets, and MCP policy
                </span>
              </button>
              <button
                type="button"
                className="start__action"
                disabled={busy}
                onClick={handleOpenProject}
              >
                <span className="start__action-title">Open Project</span>
                <span className="start__action-desc">
                  Load an existing project.arcforge.json
                </span>
              </button>
              <button
                type="button"
                className="start__action"
                disabled={busy}
                onClick={handleUntitled}
              >
                <span className="start__action-title">Quick Start</span>
                <span className="start__action-desc">
                  Open an untitled demo scene without saving to disk
                </span>
              </button>
            </section>

            <section className="start__recent">
              <h2>Recent</h2>
              {recent.length === 0 ? (
                <p className="muted">No recent projects yet.</p>
              ) : (
                <ul className="start__recent-list">
                  {recent.map((item) => (
                    <li key={item.path}>
                      <button
                        type="button"
                        className="start__recent-item"
                        disabled={busy}
                        onClick={() => handleOpenRecent(item)}
                      >
                        <span className="start__recent-name">{item.name}</span>
                        <span className="start__recent-path">{item.path}</span>
                      </button>
                      <button
                        type="button"
                        className="start__recent-remove"
                        title="Remove from recent"
                        disabled={busy}
                        onClick={() => setRecent(removeRecentProject(item.path))}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <section className="start__new">
            <h2>New Project</h2>
            <label className="field">
              <span>Project name</span>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Game"
                autoFocus
                disabled={busy}
              />
            </label>
            <p className="muted start__new-hint">
              Next you&apos;ll pick a parent folder. ArcForge creates a subfolder with{" "}
              <code>project.arcforge.json</code>, a starter scene, and docs.
            </p>
            <div className="start__new-actions">
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => setPanel("home")}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn--play"
                disabled={busy || !projectName.trim()}
                onClick={handleCreate}
              >
                {busy ? "Creating…" : "Choose folder & create"}
              </button>
            </div>
          </section>
        )}

        <footer className="start__foot muted">
          Tip: after opening a project, use <strong>Connect MCP</strong> to wire your AI IDE.
        </footer>
      </div>
    </div>
  );
}
