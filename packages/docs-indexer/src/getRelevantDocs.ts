import { searchDocs } from "./searchDocs.js";
import type { DocIndex, DocSearchHit, DocSource } from "./types.js";

export interface GetRelevantOptions {
  /** Max doc hits to return (default 10). */
  limit?: number;
  /** Project script paths (e.g. scripts/player.controller.ts). */
  scriptPaths?: string[];
  /** Component ids present in the catalog or project. */
  componentIds?: string[];
  /** MCP tools the current policy allows. */
  allowedTools?: string[];
}

export interface RelevantComponent {
  id: string;
  uri: string;
  title: string;
  snippet: string;
}

export interface RelevantScript {
  path: string;
  reason: string;
}

export interface RelevantDocsResult {
  task: string;
  docs: DocSearchHit[];
  components: RelevantComponent[];
  scripts: RelevantScript[];
  examples: DocSearchHit[];
  conventions: DocSearchHit[];
  allowedTools: string[];
  warnings: string[];
}

const DEFAULT_ALLOWED_TOOLS = [
  "docs.search",
  "docs.read",
  "docs.get_relevant",
  "docs.list_sources",
  "project.get_info",
  "component.list",
  "component.get_schema",
  "scene.open",
  "build.get_errors",
];

const TASK_WARNINGS: Array<{ pattern: RegExp; warning: string }> = [
  {
    pattern: /\b(engine|game.?loop|render.?private)\b/i,
    warning:
      "Prefer scene/prefab/script changes over engine core edits unless explicitly requested.",
  },
  {
    pattern: /\b(physics|rigidbody|collider)\b/i,
    warning:
      "Physics is an abstraction layer; check component schemas before assuming Rapier APIs.",
  },
  {
    pattern: /\b(export|build|deploy)\b/i,
    warning: "Run project validation / build.get_errors before exporting.",
  },
  {
    pattern: /\b(script|behaviour|controller)\b/i,
    warning: "Read arcforge://docs/scripting/behaviour and typecheck after script edits.",
  },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9./:_-]+/)
    .filter((t) => t.length > 1);
}

function snippetFromSource(source: DocSource): string {
  const line =
    source.body
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("#")) ?? source.title;
  return line.slice(0, 180);
}

function componentIdFromUri(uri: string): string | null {
  const match = uri.match(/^arcforge:\/\/docs\/components\/(.+)$/);
  return match?.[1] ?? null;
}

function isConventionHit(hit: DocSearchHit, source?: DocSource): boolean {
  return (
    hit.scope === "project" ||
    hit.uri.includes("conventions") ||
    hit.uri.includes("ai-rules") ||
    hit.uri.includes("AI_NOTES") ||
    hit.uri.includes("PROJECT_CONVENTIONS") ||
    hit.uri.includes("GAME_DESIGN") ||
    source?.tags.includes("conventions") === true ||
    source?.tags.includes("ai-rules") === true
  );
}

function isExampleHit(hit: DocSearchHit, source?: DocSource): boolean {
  return (
    hit.uri.includes("example") ||
    hit.title.toLowerCase().includes("example") ||
    source?.tags.includes("example") === true
  );
}

function categorizeHits(
  index: DocIndex,
  hits: DocSearchHit[]
): {
  docs: DocSearchHit[];
  components: RelevantComponent[];
  examples: DocSearchHit[];
  conventions: DocSearchHit[];
} {
  const components: RelevantComponent[] = [];
  const examples: DocSearchHit[] = [];
  const conventions: DocSearchHit[] = [];
  const docs: DocSearchHit[] = [];
  const seenComponents = new Set<string>();

  for (const hit of hits) {
    const source = index.sources.find((s) => s.uri === hit.uri);
    const id = componentIdFromUri(hit.uri);
    if (id) {
      if (!seenComponents.has(id)) {
        seenComponents.add(id);
        components.push({
          id,
          uri: hit.uri,
          title: hit.title,
          snippet: hit.snippet,
        });
      }
      continue;
    }

    if (isConventionHit(hit, source)) {
      conventions.push(hit);
      continue;
    }

    if (isExampleHit(hit, source)) {
      examples.push(hit);
      continue;
    }

    docs.push(hit);
  }

  return { docs, components, examples, conventions };
}

function matchScripts(task: string, scriptPaths: string[]): RelevantScript[] {
  if (scriptPaths.length === 0) return [];
  const terms = tokenize(task);
  const scored: Array<RelevantScript & { score: number }> = [];

  for (const scriptPath of scriptPaths) {
    const base = scriptPath.replace(/^scripts\//, "").replace(/\.ts$/i, "");
    const tokens = tokenize(base.replace(/[._-]/g, " "));
    let score = 0;
    const reasons: string[] = [];
    for (const term of terms) {
      if (base.toLowerCase().includes(term) || tokens.includes(term)) {
        score += 3;
        reasons.push(`matches "${term}"`);
      }
    }
    if (score > 0) {
      scored.push({
        path: scriptPath,
        reason: reasons.slice(0, 3).join(", "),
        score,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return scored.slice(0, 8).map(({ path, reason }) => ({ path, reason }));
}

function matchCatalogComponents(
  index: DocIndex,
  task: string,
  componentIds: string[],
  already: RelevantComponent[]
): RelevantComponent[] {
  const terms = tokenize(task);
  const seen = new Set(already.map((c) => c.id));
  const extra: RelevantComponent[] = [];

  for (const id of componentIds) {
    if (seen.has(id)) continue;
    const idTerms = tokenize(id.replace(/\./g, " "));
    const overlap =
      idTerms.some((t) => terms.includes(t)) || terms.some((t) => id.toLowerCase().includes(t));
    if (!overlap) continue;

    const source = index.sources.find((s) => s.uri === `arcforge://docs/components/${id}`);
    if (!source) continue;
    seen.add(id);
    extra.push({
      id,
      uri: source.uri,
      title: source.title,
      snippet: snippetFromSource(source),
    });
  }

  return [...already, ...extra];
}

function ensureEngineRules(
  index: DocIndex,
  task: string,
  conventions: DocSearchHit[]
): DocSearchHit[] {
  if (!/\b(add|create|edit|fix|implement|build|update)\b/i.test(task)) {
    return conventions;
  }

  const rules = index.sources.find(
    (s) => s.uri === "arcforge://docs/ai-rules/ENGINE_RULES" || s.uri.endsWith("/ENGINE_RULES")
  );
  if (!rules) return conventions;
  if (conventions.some((h) => h.uri === rules.uri)) return conventions;

  return [
    {
      title: rules.title,
      uri: rules.uri,
      snippet: snippetFromSource(rules),
      score: 1,
      scope: rules.scope,
    },
    ...conventions,
  ];
}

/**
 * Return docs and project context relevant to an AI task description.
 */
export function getRelevantDocs(
  index: DocIndex,
  task: string,
  options?: GetRelevantOptions
): RelevantDocsResult {
  const limit = options?.limit ?? 10;
  const hits = searchDocs(index, task, { limit: Math.max(limit, 12) });
  const categorized = categorizeHits(index, hits.slice(0, limit));

  const components = matchCatalogComponents(
    index,
    task,
    options?.componentIds ?? [],
    categorized.components
  ).slice(0, 8);

  const scripts = matchScripts(task, options?.scriptPaths ?? []);
  const conventions = ensureEngineRules(index, task, categorized.conventions).slice(0, 6);

  const warnings = TASK_WARNINGS.filter((w) => w.pattern.test(task)).map((w) => w.warning);

  if (components.length === 0 && /\b(component|entity|prefab)\b/i.test(task)) {
    warnings.push(
      "No matching component docs found — call component.list and component.get_schema."
    );
  }

  return {
    task,
    docs: categorized.docs,
    components,
    scripts,
    examples: categorized.examples,
    conventions,
    allowedTools: options?.allowedTools ?? DEFAULT_ALLOWED_TOOLS,
    warnings,
  };
}
