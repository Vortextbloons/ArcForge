import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exportWebBuild } from "./exportWebBuild.js";
import { exportThreeProject } from "./exportThreeProject.js";
import { loadProjectBundle } from "./loadProject.js";
import { validateProjectBundle } from "./validateProject.js";
import { pathExists } from "./fsUtils.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PLATFORMER = path.join(ROOT, "examples", "platformer");

describe("exporter", () => {
  it("loads and validates the platformer example", async () => {
    const { bundle, issues } = await loadProjectBundle(PLATFORMER);
    const validation = validateProjectBundle(bundle, issues);
    expect(validation.ok).toBe(true);
    expect(bundle.scenes.length).toBeGreaterThan(0);
    expect(bundle.scripts.length).toBe(2);
  });

  it("dry-runs web and three exports", async () => {
    const web = await exportWebBuild({
      projectRoot: PLATFORMER,
      output: path.join(ROOT, "exports", "test-web"),
      dryRun: true,
    });
    expect(web.report.ok).toBe(true);
    expect(web.report.dryRun).toBe(true);

    const three = await exportThreeProject({
      projectRoot: PLATFORMER,
      output: path.join(ROOT, "exports", "test-three"),
      dryRun: true,
    });
    expect(three.report.ok).toBe(true);
  });

  it("exports editable three project for platformer", async () => {
    const out = path.join(ROOT, "exports", "platformer-three-test");
    const result = await exportThreeProject({
      projectRoot: PLATFORMER,
      output: out,
    });
    expect(result.report.ok).toBe(true);
    expect(await pathExists(path.join(out, "package.json"))).toBe(true);
    expect(await pathExists(path.join(out, "src", "game.ts"))).toBe(true);
    expect(await pathExists(path.join(out, "src", "scenes", "Main.scene.json"))).toBe(true);
    expect(
      await pathExists(path.join(out, "vendor", "@arcforge", "engine", "dist", "index.js"))
    ).toBe(true);
    expect(await pathExists(path.join(out, "build-report.json"))).toBe(true);
  }, 60_000);
});
