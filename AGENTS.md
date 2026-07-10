# AGENTS.md

## Project

Build a modular Tauri + Three.js game editor for creating shippable Three.js games via editor, runtime, and MCP.

```txt
Tauri = desktop editor | Three.js = runtime | MCP = AI layer | Exporter = web build
```

## Plans

Specs live in `plans/`. Consult relevant files before changes. Key docs: `00-overview` through `23-summary`.

## Main Rules

- Modular codebase. No god files. No mixing editor/runtime/MCP/exporter.
- Small focused files (300 lines review, 500 split, 800+ forbidden).
- Shared schemas/commands over duplication. AI via validated commands/tools.
- Don't modify engine internals unless required. No unnecessary dependencies.

## Folder Boundaries

```txt
apps/editor-tauri/    Desktop app, UI, panels, Tauri shell
packages/engine/      Runtime only—no editor/MCP/Tauri
packages/editor-core/ Commands, undo/redo, validation, project model
packages/mcp-server/  Tools, resources, prompts, auth, audit
packages/exporter/    Web & Three.js project export
packages/schemas/     Shared schemas (project, scene, prefab, component, MCP)
packages/docs-indexer/ AI docs indexing/search
templates/            Export templates
examples/             Example games, test projects
docs/                 Human & AI docs
```

## Architecture

### Runtime (`packages/engine`)

Allowed: ECS, scene loading, Three.js, input, audio, physics, scripts, assets, game loop.
Forbidden: React, Tauri, MCP, editor panels, filesystem UI.

### Editor

UI in `apps/editor-tauri`. Commands/state in `packages/editor-core`.
All mutations use commands: `CreateEntityCommand`, `DeleteEntityCommand`, `AddComponentCommand`, `UpdateComponentCommand`, `CreateScriptCommand`, `ImportAssetCommand`.
No direct file mutations from UI.

### MCP (`packages/mcp-server`)

Tools call editor commands. Prefer scoped tools: `scene.create_entity`, `scene.update_component`, `script.create/edit`, `docs.search/read`, `build.preview/export_web`.
Forbidden: `fs.write_any_file`, `shell.run_any_command`, `replace_codebase`.

### Exporter (`packages/exporter`)

Exported games must not include: Tauri, React UI, MCP, AI tools, audit logs, editor panels.

## Components

Schema-driven with: id, schema, defaults, inspector metadata, docs, runtime behavior.
Namespaced IDs: `core.transform`, `render.mesh`, `physics.rigidbody`, `script.behaviour`, `game.health`.

## Scenes & Prefabs

Portable JSON only. Files: `scenes/*.scene.json`, `prefabs/*.prefab.json`, `scripts/*.ts`.
No scene data in TypeScript unless for export.

## Scripts

Small and focused: `player.controller.ts`, `enemy.chase.ts`, `coin.collectable.ts`.
Public runtime API only—no private engine imports.

## Naming

Clear names: `MeshRendererSystem.ts`, `CreateEntityCommand.ts`.
Avoid: `utils.ts`, `helpers.ts`, `manager.ts`, `stuff.ts`.

## Change Order

1. Scene/prefab data → 2. Script → 3. Component → 4. System → 5. Plugin → 6. Engine core (last resort)

## Validation

After changes: typecheck, lint, project/scene/script validation, preview build when relevant. No known errors.

## Performance

Prefer: instancing, asset/material reuse, object pooling, lazy loading, fixed-step physics.
Avoid: duplicate meshes, unique materials, huge textures, unbounded loops, per-frame allocations.

## AI Docs

Required MCP tools: `docs.search`, `docs.read`, `docs.get_relevant`, `docs.list_sources`.
Check scripting API docs, component schemas, existing scripts, typecheck before edits.

## Final Rule

Small files. Clear boundaries. Validated commands. Schema-driven. No god files. Easy for humans and AI to extend.
