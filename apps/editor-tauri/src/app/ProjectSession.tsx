import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OpenedProject } from "../project/projectIo";
import {
  getAttachedMcpStatus,
  idleMcpStatus,
  startAttachedMcpServer,
  stopAttachedMcpServer,
  type McpRuntimeStatus,
} from "../mcp/mcpRuntime";
import { ProjectSessionContext } from "./projectSessionContextInstance";
import type { ActiveProject, ProjectSessionValue } from "./projectSessionTypes";

export type { ActiveProject, ProjectSessionValue } from "./projectSessionTypes";

export function ProjectSessionProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<ActiveProject | null>(null);
  const [mcpStatus, setMcpStatus] = useState<McpRuntimeStatus>(idleMcpStatus);

  const syncMcpForProject = useCallback(async (root: string | null) => {
    if (!root) {
      try {
        setMcpStatus(await stopAttachedMcpServer());
      } catch {
        setMcpStatus(idleMcpStatus());
      }
      return;
    }

    try {
      // Write mode so AI/MCP mutations can update the open project (hot-reloaded in the editor).
      const status = await startAttachedMcpServer(root, { write: true, port: 3847 });
      setMcpStatus(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        const status = await getAttachedMcpStatus();
        setMcpStatus({
          ...status,
          running: false,
          error: message,
        });
      } catch {
        setMcpStatus({
          ...idleMcpStatus(),
          error: message,
          logPath: root ? `${root.replace(/[/\\]+$/, "")}/.threeforge/mcp.sidecar.log` : null,
        });
      }
    }
  }, []);

  const openProject = useCallback(
    (opened: OpenedProject) => {
      setProject({
        root: opened.root,
        manifestPath: opened.manifestPath,
        manifest: opened.manifest,
        scenePath: opened.scenePath,
        initialScene: opened.scene,
      });
      void syncMcpForProject(opened.root || null);
    },
    [syncMcpForProject]
  );

  const closeProject = useCallback(() => {
    setProject(null);
    void syncMcpForProject(null);
  }, [syncMcpForProject]);

  const restartMcp = useCallback(
    async (write = true) => {
      if (!project?.root) return;
      try {
        const status = await startAttachedMcpServer(project.root, { write, port: 3847 });
        setMcpStatus(status);
      } catch (error) {
        setMcpStatus({
          ...idleMcpStatus(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [project?.root]
  );

  // Poll status while a disk project is open (detect crashed sidecar).
  useEffect(() => {
    if (!project?.root) return;
    const id = window.setInterval(() => {
      void getAttachedMcpStatus()
        .then((status) => {
          setMcpStatus(status);
          if (!status.running && !status.error) {
            void syncMcpForProject(project.root);
          }
        })
        .catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(id);
  }, [project?.root, syncMcpForProject]);

  // Stop MCP only when the window is closing — not on React HMR remounts.
  useEffect(() => {
    const onUnload = () => {
      void stopAttachedMcpServer().catch(() => undefined);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);

  const value = useMemo(
    () => ({ project, mcpStatus, openProject, closeProject, restartMcp }),
    [project, mcpStatus, openProject, closeProject, restartMcp]
  );

  return (
    <ProjectSessionContext.Provider value={value}>{children}</ProjectSessionContext.Provider>
  );
}

export function useProjectSession(): ProjectSessionValue {
  const ctx = useContext(ProjectSessionContext);
  if (!ctx) {
    throw new Error("useProjectSession must be used within ProjectSessionProvider");
  }
  return ctx;
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    import.meta.hot?.invalidate();
  });
}
