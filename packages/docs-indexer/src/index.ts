export type {
  DocScope,
  DocSource,
  DocSearchHit,
  DocIndex,
  BuildDocIndexOptions,
} from "./types.js";

export { indexMarkdown } from "./indexMarkdown.js";
export { indexComponentSchemas } from "./indexSchemas.js";
export { searchDocs, findDocByUri } from "./searchDocs.js";
export { buildDocIndex } from "./buildIndex.js";
