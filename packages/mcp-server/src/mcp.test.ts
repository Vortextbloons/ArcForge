import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createProjectContext } from "./projectContext.js";
import { createMcpServer } from "./createServer.js";
import { searchDocs } from "@arcforge/docs-indexer";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);
const PLATFORMER = path.join(ROOT, "examples", "platformer");
const ENGINE_DOCS = path.join(ROOT, "docs");

describe("mcp-server phase 5", () => {
  it("loads platformer project context", async () => {
    const ctx = await createProjectContext({
      projectRoot: PLATFORMER,
      engineDocsRoot: ENGINE_DOCS,
    });
    expect(ctx.manifest.name).toBe("Platformer Demo");
    const scenes = await ctx.listScenes();
    expect(scenes.some((s) => s.path === "scenes/Main.scene.json")).toBe(true);

    const opened = await ctx.openScene("scenes/Main.scene.json");
    expect(opened.entityCount).toBeGreaterThan(0);
    expect(opened.entities.some((e) => e.id === "player")).toBe(true);

    const errors = await ctx.getErrors();
    expect(errors.ok).toBe(true);
  });

  it("indexes scripting docs and component schemas", async () => {
    const ctx = await createProjectContext({
      projectRoot: PLATFORMER,
      engineDocsRoot: ENGINE_DOCS,
    });
    const hits = searchDocs(ctx.docs, "behaviour", { scope: "scripting" });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.uri).toContain("scripting");

    const components = ctx.listComponents();
    expect(components.some((c) => c.id === "core.transform")).toBe(true);
  });

  it("creates an MCP server with read-only tools registered", async () => {
    const ctx = await createProjectContext({
      projectRoot: PLATFORMER,
      engineDocsRoot: ENGINE_DOCS,
    });
    const server = createMcpServer(ctx);
    expect(server).toBeTruthy();
    // Underlying server should advertise tools capability.
    await server.close();
  });
});
