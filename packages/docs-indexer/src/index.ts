export interface DocSource {
  uri: string;
  title: string;
  kind: "markdown" | "json";
  path: string;
  tags: string[];
}

export interface DocIndex {
  version: number;
  generatedAt: string;
  sources: DocSource[];
}

export async function indexMarkdown(_path: string): Promise<DocSource[]> {
  return [];
}

export async function searchDocs(
  _query: string,
  _scope?: string
): Promise<DocSource[]> {
  return [];
}
