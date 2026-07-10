import { promises as fs } from "node:fs";
import path from "node:path";
import { threeforgeDir } from "../auth/permissions.js";

export interface PreviewState {
  active: boolean;
  scene: string | null;
  startedAt: string | null;
  note: string;
}

/**
 * Headless preview stub — writes preview marker for the editor / exporters.
 * Full live viewport refresh requires attached Tauri mode (later).
 */
export class PreviewSession {
  private state: PreviewState = {
    active: false,
    scene: null,
    startedAt: null,
    note: "Headless preview marker only",
  };

  constructor(private readonly projectRoot: string) {}

  private file(): string {
    return path.join(threeforgeDir(this.projectRoot), "preview", "state.json");
  }

  async start(scene: string): Promise<PreviewState> {
    const rel = scene.replace(/\\/g, "/");
    this.state = {
      active: true,
      scene: rel,
      startedAt: new Date().toISOString(),
      note: this.noteForMode(),
    };
    await fs.mkdir(path.dirname(this.file()), { recursive: true });
    await fs.writeFile(
      this.file(),
      `${JSON.stringify(this.state, null, 2)}\n`,
      "utf8"
    );
    return this.state;
  }

  getStatus(): PreviewState {
    return { ...this.state };
  }

  private noteForMode(): string {
    return "Preview requested. In headless MCP mode this writes .threeforge/preview/state.json; open the Tauri editor (attached mode) for a live viewport.";
  }
}
