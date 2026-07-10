import path from "node:path";
import { promises as fs } from "node:fs";
import { CORE_COMPONENT_MAP } from "@arcforge/schemas";

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export function normalizeProjectRel(
  rel: string,
  allowedPrefix: string
): string {
  const posix = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    !posix.startsWith(allowedPrefix) ||
    posix.includes("..") ||
    path.isAbsolute(rel) ||
    /^[a-zA-Z]:/.test(rel)
  ) {
    throw new Error(`Path must be under ${allowedPrefix}: ${rel}`);
  }
  return posix;
}

export function absUnderRoot(projectRoot: string, rel: string): string {
  return path.join(projectRoot, ...rel.split("/"));
}

export function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const prev = out[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      prev &&
      typeof prev === "object" &&
      !Array.isArray(prev)
    ) {
      out[key] = deepMerge(
        prev as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function validateComponents(components: Record<string, unknown>): void {
  for (const [id, data] of Object.entries(components)) {
    const def = CORE_COMPONENT_MAP[id];
    if (!def) continue;
    def.schema.parse(data);
  }
}
