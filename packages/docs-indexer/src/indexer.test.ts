import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildDocIndex,
  searchDocs,
  findDocByUri,
  getRelevantDocs,
} from "./index.js";

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
    expect(index.sources.length).toBeGreaterThan(6);

    const behaviour = findDocByUri(
      index,
      "arcforge://docs/scripting/behaviour"
    );
    expect(behaviour?.title).toContain("Behaviour");

    const rules = findDocByUri(
      index,
      "arcforge://docs/ai-rules/ENGINE_RULES"
    );
    expect(rules?.body).toContain("Prefer these change types");

    const conventions = findDocByUri(
      index,
      "arcforge://project/PROJECT_CONVENTIONS"
    );
    expect(conventions?.scope).toBe("project");

    const hits = searchDocs(index, "export web build", { scope: "exporting" });
    expect(hits.length).toBeGreaterThan(0);

    const transform = findDocByUri(
      index,
      "arcforge://docs/components/core.transform"
    );
    expect(transform?.body).toContain("core.transform");
  });

  it("persists docs.index.json and generated docs", async () => {
    const projectRoot = path.join(ROOT, "examples", "platformer");
    await buildDocIndex({
      engineDocsRoot: path.join(ROOT, "docs"),
      projectRoot,
      persistIndex: true,
      writeGenerated: true,
    });

    const indexFile = path.join(projectRoot, ".arcforge", "docs.index.json");
    const raw = JSON.parse(await fs.readFile(indexFile, "utf8")) as {
      version: number;
      sources: unknown[];
    };
    expect(raw.version).toBe(1);
    expect(raw.sources.length).toBeGreaterThan(0);

    const componentsJson = path.join(ROOT, ".generated", "docs", "components.json");
    const components = JSON.parse(await fs.readFile(componentsJson, "utf8")) as {
      components: Array<{ id: string }>;
    };
    expect(components.components.some((c) => c.id === "core.transform")).toBe(
      true
    );
  });

  it("returns task-relevant docs via getRelevantDocs", async () => {
    const index = await buildDocIndex({
      engineDocsRoot: path.join(ROOT, "docs"),
      projectRoot: path.join(ROOT, "examples", "platformer"),
      persistIndex: false,
      writeGenerated: false,
    });

    const relevant = getRelevantDocs(
      index,
      "Add a player controller script with coin pickup and camera",
      {
        scriptPaths: [
          "scripts/player.controller.ts",
          "scripts/coin.collectable.ts",
        ],
        componentIds: ["core.transform", "render.mesh", "script.behaviour"],
      }
    );

    expect(relevant.scripts.some((s) => s.path.includes("player"))).toBe(true);
    expect(relevant.scripts.some((s) => s.path.includes("coin"))).toBe(true);
    expect(relevant.conventions.length).toBeGreaterThan(0);
    expect(relevant.warnings.some((w) => /script/i.test(w))).toBe(true);
    expect(relevant.allowedTools).toContain("docs.get_relevant");
  });
});
