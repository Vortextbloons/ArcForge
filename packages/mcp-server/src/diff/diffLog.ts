import { promises as fs } from "node:fs";
import path from "node:path";
import { threeforgeDir } from "../auth/permissions.js";

export interface DiffEntry {
  id: string;
  at: string;
  clientId: string;
  tool: string;
  summary: string;
  paths: string[];
  before?: unknown;
  after?: unknown;
  validationOk: boolean;
  reverted?: boolean;
}

export interface DiffLogState {
  version: number;
  entries: DiffEntry[];
}

/**
 * Tracks AI write operations for review / summarize / revert metadata.
 */
export class DiffLog {
  private state: DiffLogState = { version: 1, entries: [] };
  private loaded = false;

  constructor(private readonly projectRoot: string) {}

  private file(): string {
    return path.join(threeforgeDir(this.projectRoot), "mcp.diff.json");
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = JSON.parse(await fs.readFile(this.file(), "utf8")) as DiffLogState;
      this.state = {
        version: raw.version ?? 1,
        entries: Array.isArray(raw.entries) ? raw.entries : [],
      };
    } catch {
      this.state = { version: 1, entries: [] };
    }
    this.loaded = true;
  }

  async record(
    entry: Omit<DiffEntry, "id" | "at" | "reverted"> & { at?: string }
  ): Promise<DiffEntry> {
    await this.load();
    const full: DiffEntry = {
      id: `diff_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      at: entry.at ?? new Date().toISOString(),
      clientId: entry.clientId,
      tool: entry.tool,
      summary: entry.summary,
      paths: entry.paths,
      before: entry.before,
      after: entry.after,
      validationOk: entry.validationOk,
      reverted: false,
    };
    this.state.entries.unshift(full);
    this.state.entries = this.state.entries.slice(0, 100);
    await this.persist();
    return full;
  }

  async list(limit = 20): Promise<DiffEntry[]> {
    await this.load();
    return this.state.entries.slice(0, limit);
  }

  async summarize(limit = 20): Promise<{
    count: number;
    paths: string[];
    entries: Array<Pick<DiffEntry, "id" | "at" | "tool" | "summary" | "paths" | "validationOk">>;
  }> {
    const entries = await this.list(limit);
    const paths = [...new Set(entries.flatMap((e) => e.paths))];
    return {
      count: entries.length,
      paths,
      entries: entries.map((e) => ({
        id: e.id,
        at: e.at,
        tool: e.tool,
        summary: e.summary,
        paths: e.paths,
        validationOk: e.validationOk,
      })),
    };
  }

  private async persist(): Promise<void> {
    await fs.mkdir(threeforgeDir(this.projectRoot), { recursive: true });
    await fs.writeFile(
      this.file(),
      `${JSON.stringify(this.state, null, 2)}\n`,
      "utf8"
    );
  }
}
