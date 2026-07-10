import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExportIssue } from "./types.js";

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function readJsonFile(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

export async function writeJsonFile(
  filePath: string,
  data: unknown,
  pretty = true
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const body = pretty ? `${JSON.stringify(data, null, 2)}\n` : `${JSON.stringify(data)}\n`;
  await fs.writeFile(filePath, body, "utf8");
}

export async function writeTextFile(
  filePath: string,
  contents: string
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, contents, "utf8");
}

export async function copyFile(src: string, dest: string): Promise<void> {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

export async function copyDirectory(
  src: string,
  dest: string,
  options?: { ignore?: (relPath: string) => boolean }
): Promise<string[]> {
  const copied: string[] = [];
  if (!(await pathExists(src))) return copied;

  async function walk(current: string, rel = ""): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (options?.ignore?.(nextRel)) continue;
      const from = path.join(current, entry.name);
      const to = path.join(dest, ...nextRel.split("/"));
      if (entry.isDirectory()) {
        await ensureDir(to);
        await walk(from, nextRel);
      } else if (entry.isFile()) {
        await copyFile(from, to);
        copied.push(nextRel.replace(/\\/g, "/"));
      }
    }
  }

  await ensureDir(dest);
  await walk(src);
  return copied;
}

export async function listFiles(
  root: string,
  predicate: (relPath: string) => boolean
): Promise<string[]> {
  const results: string[] = [];
  if (!(await pathExists(root))) return results;

  async function walk(current: string, rel = ""): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextRel = rel ? `${rel}/${entry.name}` : entry.name;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full, nextRel);
      } else if (entry.isFile() && predicate(nextRel.replace(/\\/g, "/"))) {
        results.push(nextRel.replace(/\\/g, "/"));
      }
    }
  }

  await walk(root);
  return results;
}

export function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

export function resolveUnderRoot(
  root: string,
  relativePath: string
): string | null {
  const normalized = toPosix(relativePath).replace(/^\/+/, "");
  if (
    normalized.includes("..") ||
    path.isAbsolute(relativePath) ||
    /^[a-zA-Z]:/.test(relativePath)
  ) {
    return null;
  }
  return path.join(root, ...normalized.split("/"));
}

export function issue(
  severity: ExportIssue["severity"],
  code: string,
  message: string,
  filePath?: string
): ExportIssue {
  return { severity, code, message, path: filePath };
}
