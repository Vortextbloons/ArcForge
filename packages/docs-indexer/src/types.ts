export type DocScope =
  | "all"
  | "engine"
  | "project"
  | "scripting"
  | "components"
  | "mcp"
  | "plugins"
  | "exporting";

export interface DocSource {
  uri: string;
  title: string;
  kind: "markdown" | "json" | "schema";
  /** Absolute filesystem path, or empty for generated in-memory docs. */
  path: string;
  tags: string[];
  scope: DocScope;
  /** Indexed text body used for search. */
  body: string;
}

export interface DocSearchHit {
  title: string;
  uri: string;
  snippet: string;
  score: number;
  scope: DocScope;
}

export interface DocIndex {
  version: number;
  generatedAt: string;
  sources: DocSource[];
}

export interface BuildDocIndexOptions {
  /** Absolute path to game project root (optional). */
  projectRoot?: string;
  /** Absolute path to ArcForge monorepo docs/ folder. */
  engineDocsRoot?: string;
  /** Include project docs/ folder. Default true when projectRoot is set. */
  includeProjectDocs?: boolean;
  /** Include component schemas as docs. Default true. */
  includeComponentSchemas?: boolean;
  /** Write .arcforge/docs.index.json when projectRoot is set. Default true. */
  persistIndex?: boolean;
  /** Write .generated/docs/*.json. Default true when a root is available. */
  writeGenerated?: boolean;
}
