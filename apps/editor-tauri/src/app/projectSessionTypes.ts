import type { ProjectManifest, Scene } from "@arcforge/schemas";
import type { OpenedProject } from "../project/projectIo";
import type { McpRuntimeStatus } from "../mcp/mcpRuntime";

export interface ActiveProject {
  root: string;
  manifestPath: string;
  manifest: ProjectManifest;
  scenePath: string | null;
  initialScene: Scene;
}

export interface ProjectSessionValue {
  project: ActiveProject | null;
  mcpStatus: McpRuntimeStatus;
  openProject: (opened: OpenedProject) => void;
  closeProject: () => void;
  restartMcp: (write?: boolean) => Promise<void>;
}
