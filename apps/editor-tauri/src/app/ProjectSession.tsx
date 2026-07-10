import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProjectManifest, Scene } from "@arcforge/schemas";
import type { OpenedProject } from "../project/projectIo";
import {
  getAttachedMcpStatus,
  idleMcpStatus,
  startAttachedMcpServer,
  stopAttachedMcpServer,
  type McpRuntimeStatus,
} from "../mcp/mcpRuntime";

export interface ActiveProject {
  root: string;
  manifestPath: string;
  manifest: ProjectManifest;
  scenePath: string | null;
  initialScene: Scene;
}

interface ProjectSessionValue {
  project: ActiveProject | null;
  mcpStatus: McpRuntimeStatus;
  openProject: (opened: OpenedProject) => void;
  closeProject: () => void;
  restartMcp: (write?: boolean) => Promise<void>;
}

const ProjectSessionContext = createContext<ProjectSessionValue | null>(null);

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
      const status = await startAttachedMcpServer(root, { write: false, port: 3847 });
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
    async (write = false) => {
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
          // If the child died but we still have a project, try one restart.
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
