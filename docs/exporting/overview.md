# Exporting Games

ThreeForge can export two kinds of builds from a game project:

1. **Playable web build** — static `index.html` + `game.js` + assets
2. **Editable Three.js / Vite project** — normal npm project you can keep editing

## CLI

From the monorepo root (after building engine/schemas):

```bash
pnpm --filter @threeforge/exporter build

pnpm export:web -- examples/platformer exports/platformer-web
pnpm export:three -- examples/platformer exports/platformer-three
```

Dry run (validate only):

```bash
pnpm export:web -- examples/platformer exports/platformer-web --dry-run
```

## Programmatic API

```ts
import { exportWebBuild, exportThreeProject } from "@threeforge/exporter";

await exportWebBuild({
  projectRoot: "/path/to/MyGame",
  output: "/path/to/out-web",
});

await exportThreeProject({
  projectRoot: "/path/to/MyGame",
  output: "/path/to/out-three",
});
```

## What is included / excluded

**Included:** Three.js, runtime engine, scene JSON, compiled scripts, referenced assets.

**Excluded:** Tauri, MCP, React editor UI, inspector, AI docs, audit logs.

## Build report

Each export writes `build-report.json` and `build-report.md` in the output folder listing scenes, scripts, assets copied, and validation issues.
