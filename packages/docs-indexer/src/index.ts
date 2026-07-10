export type { DocScope, DocSource, DocSearchHit, DocIndex, BuildDocIndexOptions } from "./types.js";

export type {
  GetRelevantOptions,
  RelevantComponent,
  RelevantScript,
  RelevantDocsResult,
} from "./getRelevantDocs.js";

export { indexMarkdown } from "./indexMarkdown.js";
export { indexComponentSchemas } from "./indexSchemas.js";
export { searchDocs, findDocByUri } from "./searchDocs.js";
export { getRelevantDocs } from "./getRelevantDocs.js";
export { buildDocIndex } from "./buildIndex.js";
export { writeDocsIndexFile, writeGeneratedDocs } from "./persistIndex.js";
