import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildDocIndex, searchDocs, findDocByUri } from "./index.js";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);

describe("docs-indexer", () => {
  it("indexes engine markdown and component schemas", async () => {
    const index = await buildDocIndex({
      engineDocsRoot: path.join(ROOT, "docs"),
      projectRoot: path.join(ROOT, "examples", "platformer"),
    });
    expect(index.sources.length).toBeGreaterThan(3);

    const behaviour = findDocByUri(
      index,
      "threeforge://docs/scripting/behaviour"
    );
    expect(behaviour?.title).toContain("Behaviour");

    const hits = searchDocs(index, "export web build", { scope: "exporting" });
    expect(hits.length).toBeGreaterThan(0);

    const transform = findDocByUri(
      index,
      "threeforge://docs/components/core.transform"
    );
    expect(transform?.body).toContain("core.transform");
  });
});
