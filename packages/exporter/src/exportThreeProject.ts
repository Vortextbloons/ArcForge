import { promises as fs } from "node:fs";
import path from "node:path";
import { prepareExport } from "./prepareExport.js";
import { optimizeAssets } from "./optimizeAssets.js";
import { createBuildReport, writeBuildReport } from "./buildReport.js";
import { generatePackageJson, generateReadme } from "./generatePackage.js";
import {
  copyDirectory,
  ensureDir,
  pathExists,
  writeJsonFile,
  writeTextFile,
  toPosix,
} from "./fsUtils.js";
import { resolveTemplateRoot, resolveWorkspacePackage } from "./paths.js";
import type { ExportOptions, ExportResult, ProjectBundle } from "./types.js";

/**
 * Export an editable Three.js / Vite project that runs without the editor.
 */
export async function exportThreeProject(
  options: ExportOptions
): Promise<ExportResult> {
  const prepared = await prepareExport(options, "three-project");
  if (!prepared.ok) return { report: prepared.report };

  const { bundle, issues, scriptDiagnostics, startedAt } = prepared;
  const output = path.resolve(options.output);
  let assetsCopied: string[] = [];
  const includeEngine = options.includeEngineSource !== false;

  if (!options.dryRun) {
    await fs.rm(output, { recursive: true, force: true });
    await ensureDir(output);

    const templateRoot = await resolveTemplateRoot();
    await copyDirectory(templateRoot, output, {
      ignore: (rel) =>
        rel === "node_modules" ||
        rel.startsWith("node_modules/") ||
        rel === "dist" ||
        rel.startsWith("dist/"),
    });

    for (const scene of bundle.scenes) {
      await writeJsonFile(path.join(output, "src", scene.path), scene.scene);
    }
    for (const prefab of bundle.prefabs) {
      await writeJsonFile(path.join(output, "src", prefab.path), prefab.prefab);
    }
    for (const script of bundle.scripts) {
      await writeTextFile(path.join(output, "src", script.path), script.source);
    }

    assetsCopied = await optimizeAssets(
      bundle,
      path.join(output, "public", "assets"),
      options.optimize !== false
    );

    await writeJsonFile(path.join(output, "src", "project.manifest.json"), {
      name: bundle.manifest.name,
      engineVersion: bundle.manifest.engineVersion,
      defaultScene: bundle.manifest.defaultScene,
      render: bundle.manifest.render,
    });

    await writeGameBootstrap(bundle, output);
    await writeTextFile(
      path.join(output, "README.md"),
      generateReadme({
        name: bundle.manifest.name,
        defaultScene: bundle.manifest.defaultScene,
      })
    );
    await writeJsonFile(
      path.join(output, "package.json"),
      generatePackageJson({
        name: bundle.manifest.name,
        manifest: bundle.manifest,
      })
    );

    if (includeEngine) {
      await vendorPackages(output);
    }
  }

  const report = createBuildReport({
    mode: "three-project",
    projectName: bundle.manifest.name,
    output,
    startedAt,
    finishedAt: new Date(),
    scenes: bundle.scenes.map((s) => s.path),
    prefabs: bundle.prefabs.map((p) => p.path),
    scripts: bundle.scripts.map((s) => s.path),
    assetsCopied,
    issues,
    scriptDiagnostics,
    dryRun: Boolean(options.dryRun),
  });

  if (!options.dryRun) {
    await writeBuildReport(output, report);
  }

  return { report };
}

async function writeGameBootstrap(
  bundle: ProjectBundle,
  output: string
): Promise<void> {
  const scriptEntries = bundle.scripts.map((s) => ({
    modulePath: s.path,
    importPath: `./${toPosix(s.path).replace(/\.ts$/, "")}`,
  }));

  const importLines = scriptEntries
    .map((s, i) => `import script_${i} from ${JSON.stringify(s.importPath)};`)
    .join("\n");
  const registerLines = scriptEntries
    .map(
      (s, i) =>
        `  runtime.registerScript(${JSON.stringify(s.modulePath)}, script_${i});`
    )
    .join("\n");

  const sceneImport = `./${toPosix(bundle.manifest.defaultScene)}`;

  await writeTextFile(
    path.join(output, "src", "game.ts"),
    `import { Runtime } from "@threeforge/engine";
import manifest from "./project.manifest.json";
import defaultScene from ${JSON.stringify(sceneImport)};
${importLines}

/** Bootstraps the exported game with Runtime + registered Behaviour scripts. */
export async function startGame(canvas: HTMLCanvasElement): Promise<Runtime> {
  const runtime = new Runtime({
    canvas,
    antialias: manifest.render?.antialias ?? true,
    shadows: manifest.render?.shadows ?? true,
    scriptsEnabled: true,
  });

${registerLines}

  const resize = () => {
    const parent = canvas.parentElement;
    const w = parent?.clientWidth ?? window.innerWidth;
    const h = parent?.clientHeight ?? window.innerHeight;
    runtime.setSize(w, h);
  };
  resize();
  window.addEventListener("resize", resize);

  runtime.load(defaultScene);
  runtime.start();
  return runtime;
}
`
  );

  await writeTextFile(
    path.join(output, "src", "main.ts"),
    `import { startGame } from "./game";

const canvas = document.querySelector("#game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("#game canvas missing");
}

startGame(canvas).catch((err) => {
  console.error(err);
  const el = document.querySelector("#error");
  if (el) el.textContent = String(err);
});
`
  );
}

async function vendorPackages(output: string): Promise<void> {
  const engineRoot = await resolveWorkspacePackage("engine");
  const schemasRoot = await resolveWorkspacePackage("schemas");

  for (const [name, root] of [
    ["engine", engineRoot],
    ["schemas", schemasRoot],
  ] as const) {
    if (!(await pathExists(path.join(root, "dist", "index.js")))) {
      throw new Error(
        `Package not built: ${root}. Run pnpm build for engine/schemas first.`
      );
    }
    const dest = path.join(output, "vendor", "@threeforge", name);
    await ensureDir(dest);
    await copyDirectory(path.join(root, "dist"), path.join(dest, "dist"), {
      ignore: (rel) => rel.endsWith(".map"),
    });

    const srcPkg = JSON.parse(
      await fs.readFile(path.join(root, "package.json"), "utf8")
    ) as {
      name: string;
      version: string;
      type?: string;
      dependencies?: Record<string, string>;
    };

    const vendorPkg: Record<string, unknown> = {
      name: srcPkg.name,
      version: srcPkg.version,
      type: srcPkg.type ?? "module",
      main: "./dist/index.js",
      types: "./dist/index.d.ts",
      exports: {
        ".": {
          import: "./dist/index.js",
          types: "./dist/index.d.ts",
        },
      },
    };

    if (name === "engine") {
      vendorPkg.dependencies = {
        three: "^0.166.1",
        "@threeforge/schemas": "file:../schemas",
      };
    } else if (srcPkg.dependencies) {
      vendorPkg.dependencies = srcPkg.dependencies;
    }

    await writeJsonFile(path.join(dest, "package.json"), vendorPkg);
  }
}
