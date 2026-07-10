import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createProjectContext } from "./projectContext.js";
import { createPlugin, listPlugins } from "./mutations/pluginMutations.js";
import { pairClient, listClients } from "./auth/clientRegistry.js";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);
const PLATFORMER = path.join(ROOT, "examples", "platformer");
const ENGINE_DOCS = path.join(ROOT, "docs");

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(from, to);
    else await fs.copyFile(from, to);
  }
}

describe("phase 8 plugins + auth", () => {
  let tempRoot = "";

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "af-p8-"));
    await copyDir(PLATFORMER, tempRoot);
  });

  afterEach(async () => {
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("lists the collectable example plugin", async () => {
    const plugins = await listPlugins(PLATFORMER);
    expect(plugins.some((p) => p.manifest.id === "game.collectable")).toBe(
      true
    );
  });

  it("scaffolds a new plugin", async () => {
    const created = await createPlugin(tempRoot, {
      id: "game.inventory",
      name: "Inventory",
    });
    expect(created.data.id).toBe("game.inventory");
    const plugins = await listPlugins(tempRoot);
    expect(plugins.some((p) => p.manifest.id === "game.inventory")).toBe(true);
  });

  it("pairs a local MCP client", async () => {
    const client = await pairClient(tempRoot, { name: "Cursor" });
    expect(client.token.length).toBeGreaterThan(10);
    const listed = await listClients(tempRoot);
    expect(listed.some((c) => c.id === client.id)).toBe(true);
  });

  it("includes performance warnings in getErrors", async () => {
    const ctx = await createProjectContext({
      projectRoot: tempRoot,
      engineDocsRoot: ENGINE_DOCS,
    });
    const errors = await ctx.getErrors();
    expect(errors.ok).toBe(true);
    expect(Array.isArray(errors.warnings)).toBe(true);
  });
});
