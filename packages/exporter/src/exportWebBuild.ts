import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { build as viteBuild } from "vite";
import { prepareExport } from "./prepareExport.js";
import { optimizeAssets } from "./optimizeAssets.js";
import { createBuildReport, writeBuildReport } from "./buildReport.js";
import { ensureDir, pathExists, writeJsonFile, writeTextFile, toPosix } from "./fsUtils.js";
import { resolveWorkspacePackage } from "./paths.js";
import type { ExportOptions, ExportResult, ProjectBundle } from "./types.js";

const require = createRequire(import.meta.url);

/**
 * Export a playable static web build (Vite-bundled Runtime + scene + scripts).
 */
export async function exportWebBuild(options: ExportOptions): Promise<ExportResult> {
  const prepared = await prepareExport(options, "web");
  if (!prepared.ok) return { report: prepared.report };

  const { bundle, issues, scriptDiagnostics, startedAt } = prepared;
  const output = path.resolve(options.output);
  let assetsCopied: string[] = [];

  if (!options.dryRun) {
    // Staging lives outside outDir so Vite emptyOutDir cannot delete it mid-build.
    const staging = `${output}.staging`;
    await fs.rm(output, { recursive: true, force: true });
    await fs.rm(staging, { recursive: true, force: true });
    await ensureDir(staging);
    await ensureDir(output);

    assetsCopied = await optimizeAssets(
      bundle,
      path.join(staging, "public", "assets"),
      options.optimize !== false
    );

    await writeProjectData(bundle, path.join(staging, "public", "project.data.json"));
    await assertPackagesBuilt();
    await writeStagingSources(bundle, staging);

    const engineRoot = await resolveWorkspacePackage("engine");
    const schemasRoot = await resolveWorkspacePackage("schemas");
    const threeEntry = require.resolve("three", { paths: [engineRoot] });
    const zodEntry = require.resolve("zod", { paths: [schemasRoot] });

    await viteBuild({
      root: staging,
      base: "./",
      publicDir: path.join(staging, "public"),
      configFile: false,
      resolve: {
        alias: [
          { find: /^@arcforge\/engine$/, replacement: path.join(engineRoot, "dist/index.js") },
          { find: /^@arcforge\/schemas$/, replacement: path.join(schemasRoot, "dist/index.js") },
          { find: /^three$/, replacement: threeEntry },
          { find: /^zod$/, replacement: zodEntry },
        ],
      },
      build: {
        outDir: output,
        emptyOutDir: true,
        rollupOptions: {
          input: path.join(staging, "index.html"),
          output: {
            entryFileNames: "game.js",
            chunkFileNames: "assets/[name]-[hash].js",
            assetFileNames: (info) => {
              if (info.name?.endsWith(".css")) return "game.css";
              return "assets/[name]-[hash][extname]";
            },
          },
        },
      },
      cacheDir: path.join(staging, ".vite"),
      logLevel: "warn",
    });

    await fs.rm(staging, { recursive: true, force: true });
  }

  const report = createBuildReport({
    mode: "web",
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

async function assertPackagesBuilt(): Promise<void> {
  for (const name of ["engine", "schemas"] as const) {
    const root = await resolveWorkspacePackage(name);
    if (!(await pathExists(path.join(root, "dist", "index.js")))) {
      throw new Error(`Package not built: ${root}. Run pnpm build for engine/schemas first.`);
    }
  }
}

async function writeProjectData(bundle: ProjectBundle, dest: string): Promise<void> {
  await writeJsonFile(dest, {
    name: bundle.manifest.name,
    engineVersion: bundle.manifest.engineVersion,
    defaultScene: bundle.manifest.defaultScene,
    render: bundle.manifest.render,
    scenes: Object.fromEntries(bundle.scenes.map((s) => [s.path, s.scene])),
    prefabs: Object.fromEntries(bundle.prefabs.map((p) => [p.path, p.prefab])),
  });
}

async function writeStagingSources(bundle: ProjectBundle, staging: string): Promise<void> {
  const scriptImports = bundle.scripts
    .filter((script) => script.entry)
    .map((s, i) => {
      return {
        varName: `script_${i}`,
        rel: `./${toPosix(s.path)}`,
        modulePath: s.path,
      };
    });

  for (const script of bundle.scripts) {
    await writeTextFile(path.join(staging, toPosix(script.path)), script.source);
  }

  const registerLines = scriptImports
    .map((s) => `  runtime.registerScript(${JSON.stringify(s.modulePath)}, ${s.varName});`)
    .join("\n");
  const importLines = scriptImports
    .map((s) => `import ${s.varName} from ${JSON.stringify(s.rel)};`)
    .join("\n");
  const systemImports = bundle.scripts
    .filter((script) => script.system)
    .map((system, index) => ({
      variable: `system_${index}`,
      rel: `./${toPosix(system.path)}`,
    }));
  const systemImportLines = systemImports
    .map((system) => `import ${system.variable} from ${JSON.stringify(system.rel)};`)
    .join("\n");
  const systemRegisterLines = systemImports
    .map((system) => `  runtime.extensions.registerSystem(${system.variable});`)
    .join("\n");

  await writeTextFile(
    path.join(staging, "main.ts"),
    `import { Runtime } from "@arcforge/engine";
${importLines}
${systemImportLines}

async function main() {
  const canvas = document.querySelector("#game") as HTMLCanvasElement | null;
  if (!canvas) throw new Error("#game canvas missing");

  const res = await fetch("./project.data.json");
  const data = await res.json();
  const scenePath = data.defaultScene as string;
  const scene = data.scenes[scenePath];
  if (!scene) throw new Error("Default scene missing from project.data.json");

  const runtime = new Runtime({
    canvas,
    antialias: data.render?.antialias ?? true,
    shadows: data.render?.shadows ?? true,
    scriptsEnabled: true,
  });

${registerLines}
${systemRegisterLines}
  runtime.registerScenes(data.scenes);
  runtime.registerPrefabs(data.prefabs);
  runtime.setAssetUrlResolver((assetPath) => new URL(assetPath, document.baseURI).toString());

  const resize = () => {
    runtime.setSize(window.innerWidth, window.innerHeight);
  };
  resize();
  window.addEventListener("resize", resize);

  runtime.load(scene, scenePath);
  runtime.start();
}

main().catch((err) => {
  console.error(err);
  const el = document.querySelector("#error");
  if (el) el.textContent = String(err);
});
`
  );

  await writeTextFile(
    path.join(staging, "index.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(bundle.manifest.name)}</title>
    <style>
      html, body { margin: 0; height: 100%; background: #111; overflow: hidden; }
      #game { display: block; width: 100vw; height: 100vh; }
      #error { position: fixed; left: 12px; bottom: 12px; color: #f88; font: 12px/1.4 monospace; }
    </style>
  </head>
  <body>
    <canvas id="game"></canvas>
    <div id="error"></div>
    <script type="module" src="/main.ts"></script>
  </body>
</html>
`
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
