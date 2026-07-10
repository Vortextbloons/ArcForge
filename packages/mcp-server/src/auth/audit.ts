import { promises as fs } from "node:fs";
import path from "node:path";
import { threeforgeDir } from "./permissions.js";

export interface AuditEntry {
  at: string;
  clientId: string;
  tool: string;
  capability: string;
  ok: boolean;
  message: string;
  paths?: string[];
}

export class AuditLog {
  constructor(private readonly projectRoot: string) {}

  private file(): string {
    return path.join(threeforgeDir(this.projectRoot), "mcp.audit.log");
  }

  async append(entry: Omit<AuditEntry, "at"> & { at?: string }): Promise<void> {
    const dir = threeforgeDir(this.projectRoot);
    await fs.mkdir(dir, { recursive: true });
    const line = JSON.stringify({
      at: entry.at ?? new Date().toISOString(),
      clientId: entry.clientId,
      tool: entry.tool,
      capability: entry.capability,
      ok: entry.ok,
      message: entry.message,
      paths: entry.paths,
    });
    await fs.appendFile(this.file(), `${line}\n`, "utf8");
  }
}
