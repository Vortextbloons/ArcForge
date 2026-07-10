import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProjectManifest, Scene } from "@arcforge/schemas";
import type { OpenedProject } from "../project/projectIo";

export interface ActiveProject {
  root: string;
  manifestPath: string;
  manifest: ProjectManifest;
  scenePath: string | null;
  initialScene: Scene;
}

interface ProjectSessionValue {
  project: ActiveProject | null;
  openProject: (opened: OpenedProject) => void;
  closeProject: () => void;
}

const ProjectSessionContext = createContext<ProjectSessionValue | null>(null);

export function ProjectSessionProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<ActiveProject | null>(null);

  const openProject = useCallback((opened: OpenedProject) => {
    setProject({
      root: opened.root,
      manifestPath: opened.manifestPath,
      manifest: opened.manifest,
      scenePath: opened.scenePath,
      initialScene: opened.scene,
    });
  }, []);

  const closeProject = useCallback(() => {
    setProject(null);
  }, []);

  const value = useMemo(
    () => ({ project, openProject, closeProject }),
    [project, openProject, closeProject]
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
