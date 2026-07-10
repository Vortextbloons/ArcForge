import { promises as fs } from "node:fs";
import path from "node:path";
import type { DocScope, DocSource } from "./types.js";

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function titleFromMarkdown(body: string, fallback: string): string {
  const match = body.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

function scopeFromRel(rel: string): DocScope {
  const top = rel.split("/")[0] ?? "";
  if (top === "scripting") return "scripting";
  if (top === "components") return "components";
  if (top === "mcp") return "mcp";
  if (top === "plugins") return "plugins";
  if (top === "exporting") return "exporting";
  if (top === "engine" || top === "editor" || top === "ai-rules") return "engine";
  return "engine";
}

function tagsForRel(rel: string, basename: string): string[] {
  const top = rel.split("/")[0] ?? "";
  const tags = ["engine", "markdown", basename, scopeFromRel(rel)];
  if (top === "ai-rules") tags.push("ai-rules", "conventions");
  return tags;
}

function uriFromRel(rel: string, prefix: "docs" | "project"): string {
  const withoutExt = rel.replace(/\.md$/i, "");
  return `arcforge://${prefix}/${withoutExt}`;
}

async function walkMarkdown(root: string): Promise<string[]> {
  const results: string[] = [];
  if (!(await pathExists(root))) return results;

  async function walk(current: string, rel = ""): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextRel = rel ? `${rel}/${entry.name}` : entry.name;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full, nextRel);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(nextRel.replace(/\\/g, "/"));
      }
    }
  }

  await walk(root);
  return results;
}

/**
 * Index markdown files under a docs root into DocSource entries.
 */
export async function indexMarkdown(
  docsRoot: string,
  options?: { projectDocs?: boolean }
): Promise<DocSource[]> {
  const abs = path.resolve(docsRoot);
  const files = await walkMarkdown(abs);
  const sources: DocSource[] = [];

  for (const rel of files) {
    const full = path.join(abs, ...rel.split("/"));
    const body = await fs.readFile(full, "utf8");
    const basename = path.basename(rel, ".md");
    if (options?.projectDocs) {
      const convention =
        /CONVENTION|AI_NOTES|GAME_DESIGN|AI_RULE/i.test(basename) || /conventions/i.test(rel);
      sources.push({
        uri: uriFromRel(rel, "project"),
        title: titleFromMarkdown(body, basename),
        kind: "markdown",
        path: full,
        tags: ["project", "markdown", basename, ...(convention ? ["conventions"] : [])],
        scope: "project",
        body,
      });
    } else {
      sources.push({
        uri: uriFromRel(rel, "docs"),
        title: titleFromMarkdown(body, basename),
        kind: "markdown",
        path: full,
        tags: tagsForRel(rel, basename),
        scope: scopeFromRel(rel),
        body,
      });
    }
  }

  return sources;
}
