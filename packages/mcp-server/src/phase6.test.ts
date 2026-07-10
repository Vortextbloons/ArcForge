import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createProjectContext } from "./projectContext.js";
import { decidePermission } from "./auth/permissions.js";
import { DEFAULT_POLICY } from "./auth/policyTypes.js";

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

describe("phase 6 permissions", () => {
  it("denies writes under readonly", () => {
    const decision = decidePermission(DEFAULT_POLICY, "scene.create_entity", {
      readonly: true,
      approveAsks: false,
      attached: false,
    });
    expect(decision.allowed).toBe(false);
  });

  it("auto-approves ask with approveAsks", () => {
    const decision = decidePermission(DEFAULT_POLICY, "scene.create_entity", {
      readonly: false,
      approveAsks: true,
      attached: false,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.mode).toBe("allow");
  });
});

describe("phase 6 mutations", () => {
  let tempRoot = "";

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tf-mcp-"));
    await copyDir(PLATFORMER, tempRoot);
  });

  afterEach(async () => {
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("creates entity/prefab/script through mutator + diff/audit", async () => {
    const ctx = await createProjectContext({
      projectRoot: tempRoot,
      engineDocsRoot: ENGINE_DOCS,
      readonly: false,
      approveAsks: true,
      clientId: "test",
    });

    const entity = await ctx.mutator.createEntity({
      scene: "scenes/Main.scene.json",
      name: "Spawner",
      components: {
        "core.transform": {
          position: [1, 2, 3],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      },
    });
    expect(entity.data.entityId).toBeTruthy();

    await ctx.mutator.updateComponent({
      scene: "scenes/Main.scene.json",
      entityId: entity.data.entityId,
      component: "render.mesh",
      patch: { primitive: "sphere", color: "#ff00aa" },
    });

    const prefab = await ctx.mutator.createPrefab({ name: "CoinPickup" });
    expect(prefab.data.path).toBe("prefabs/coinpickup.prefab.json");

    const script = await ctx.mutator.createScript({
      path: "scripts/spawner.controller.ts",
      purpose: "Spawns enemies",
    });
    expect(script.data.path).toBe("scripts/spawner.controller.ts");

    const preview = await ctx.preview.start("scenes/Main.scene.json");
    expect(preview.active).toBe(true);

    await ctx.diffs.record({
      clientId: "test",
      tool: "scene.create_entity",
      summary: "created spawner",
      paths: entity.paths,
      validationOk: true,
    });
    const summary = await ctx.diffs.summarize();
    expect(summary.count).toBeGreaterThan(0);

    const errors = await ctx.getErrors();
    expect(errors.ok).toBe(true);

    // policy file created
    const policy = await fs.readFile(
      path.join(tempRoot, ".threeforge", "mcp.policy.json"),
      "utf8"
    );
    expect(policy).toContain("scene.write");
  });

  it("rejects unsafe script paths", async () => {
    const ctx = await createProjectContext({
      projectRoot: tempRoot,
      engineDocsRoot: ENGINE_DOCS,
      readonly: false,
      approveAsks: true,
    });
    await expect(
      ctx.mutator.createScript({ path: "../evil.ts" })
    ).rejects.toThrow(/under scripts/);
  });
});
