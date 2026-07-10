import type { DocIndex, DocScope, DocSearchHit, DocSource } from "./types.js";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9./:_-]+/)
    .filter((t) => t.length > 1);
}

function scoreSource(source: DocSource, terms: string[]): number {
  if (terms.length === 0) return 0;
  const hay =
    `${source.title}\n${source.uri}\n${source.tags.join(" ")}\n${source.body}`.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (source.title.toLowerCase().includes(term)) score += 8;
    if (source.uri.toLowerCase().includes(term)) score += 6;
    if (source.tags.some((t) => t.toLowerCase().includes(term))) score += 4;
    const occurrences = hay.split(term).length - 1;
    score += Math.min(occurrences, 12);
  }
  return score;
}

function snippetFor(source: DocSource, terms: string[]): string {
  const plain = source.body.replace(/\r/g, "");
  const lower = plain.toLowerCase();
  let idx = -1;
  for (const term of terms) {
    idx = lower.indexOf(term);
    if (idx >= 0) break;
  }
  if (idx < 0) {
    const firstLine =
      plain
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l && !l.startsWith("#")) ?? source.title;
    return firstLine.slice(0, 180);
  }
  const start = Math.max(0, idx - 40);
  const end = Math.min(plain.length, idx + 140);
  const slice = plain.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${slice}${end < plain.length ? "…" : ""}`;
}

function scopeMatches(source: DocSource, scope?: DocScope | string): boolean {
  if (!scope || scope === "all") return true;
  return source.scope === scope || source.tags.includes(scope);
}

/**
 * Search an in-memory docs index. Lightweight keyword scorer for MVP.
 */
export function searchDocs(
  index: DocIndex | DocSource[],
  query: string,
  options?: { scope?: DocScope | string; limit?: number }
): DocSearchHit[] {
  const sources = Array.isArray(index) ? index : index.sources;
  const terms = tokenize(query);
  const limit = options?.limit ?? 8;
  const hits: DocSearchHit[] = [];

  for (const source of sources) {
    if (!scopeMatches(source, options?.scope)) continue;
    const score = terms.length === 0 ? 1 : scoreSource(source, terms);
    if (score <= 0) continue;
    hits.push({
      title: source.title,
      uri: source.uri,
      snippet: snippetFor(source, terms),
      score,
      scope: source.scope,
    });
  }

  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return hits.slice(0, limit);
}

export function findDocByUri(index: DocIndex | DocSource[], uri: string): DocSource | undefined {
  const sources = Array.isArray(index) ? index : index.sources;
  return sources.find((s) => s.uri === uri);
}
