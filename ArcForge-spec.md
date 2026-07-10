ArcForge Engine — Full Architecture Specification

## 1. Product Goal

ArcForge is a desktop game editor and runtime framework for building shippable Three.js games with both visual user editing and AI-assisted development.

The system must support:

- A Unity-like desktop editor.
- A clean Three.js runtime.
- AI editing through MCP.
- Per-project MCP authorization.
- Live preview inside the desktop app.
- Export to playable web builds.
- Export to editable Three.js/Vite projects.
- AI-accessible documentation through MCP.
- Clean, maintainable, schema-driven project structure.

The central design rule:

```txt
The AI must edit the project through documented, validated engine APIs and editor commands, not by randomly modifying engine internals.
```

---

# 2. High-Level Architecture

```txt
External AI Editor / MCP Client
  ↓ MCP
Project MCP Server
  ↓ command bridge
Tauri Desktop App
  ↓
Editor Command System
  ↓
Project Files
  ↓
Three.js Runtime Preview
  ↓
Exporter
  ↓
Playable Web Build / Editable Three.js Project
```

System parts:

```txt
Tauri Desktop App
  ├─ Visual editor
  ├─ Scene viewport
  ├─ Inspector
  ├─ Asset browser
  ├─ Console
  ├─ AI/MCP session panel
  └─ Live runtime preview

TypeScript Engine
  ├─ ECS/entity model
  ├─ Scene loader
  ├─ Three.js renderer bridge
  ├─ Asset manager
  ├─ Input
  ├─ Audio
  ├─ Physics abstraction
  ├─ Scripting API
  └─ Runtime player

MCP Server
  ├─ Project inspection tools
  ├─ Scene editing tools
  ├─ Script editing tools
  ├─ Build/export tools
  ├─ Documentation tools
  ├─ Policy enforcement
  └─ Audit logging

Exporter
  ├─ Web build export
  ├─ Editable Three.js/Vite project export
  └─ Asset optimization pipeline
```

---

# 3. Language and Technology Stack

## 3.1 Primary Stack

```txt
Editor UI:        React + TypeScript
Desktop Shell:   Tauri v2
Native Backend:  Rust
Runtime Engine:  TypeScript
Renderer:        Three.js
MCP Server:      TypeScript
Build System:    Vite
Validation:      Zod or Valibot
Testing:         Vitest + Playwright
Physics:         Rapier behind abstraction
Docs Index:      Local Markdown + generated schema docs + optional fetched references
```

## 3.2 Why TypeScript for the Engine

The engine, runtime, editor command system, MCP schemas, and exported projects should all be TypeScript.

Reasons:

- Three.js is naturally JavaScript/TypeScript-based.
- Exported projects remain understandable.
- AI coding tools handle TypeScript well.
- Component schemas can be reused across the editor, runtime, and MCP server.
- TypeScript makes it easy to export a normal Vite + Three.js project.

## 3.3 Why Rust for Tauri

Rust should be used for native desktop concerns only:

```txt
Filesystem access
Project folder permissions
Local process management
Build/export process spawning
OS dialogs
Sidecar process control
Secure token storage integration
File watching
```

Do not put gameplay logic in Rust for the MVP.

---

# 4. Repository Structure

```txt
arcforge/
  apps/
    editor-tauri/
      src/
        app/
        panels/
        viewport/
        inspector/
        hierarchy/
        asset-browser/
        console/
        mcp-access/
      src-tauri/
        src/
          main.rs
          commands/
          project_fs.rs
          process.rs
          auth.rs
          sidecar.rs

  packages/
    engine/
      src/
        core/
        ecs/
        render/
        assets/
        input/
        audio/
        physics/
        scripting/
        runtime/

    editor-core/
      src/
        commands/
        project/
        selection/
        undo/
        validation/
        diff/
        events/

    mcp-server/
      src/
        index.ts
        transport/
        auth/
        tools/
        resources/
        prompts/
        docs/
        audit/

    exporter/
      src/
        exportWebBuild.ts
        exportThreeProject.ts
        optimizeAssets.ts
        generatePackage.ts

    schemas/
      src/
        project.schema.ts
        scene.schema.ts
        prefab.schema.ts
        component.schema.ts
        script.schema.ts
        mcp.schema.ts

    docs-indexer/
      src/
        indexMarkdown.ts
        indexSchemas.ts
        searchDocs.ts

  templates/
    three-vite-game/
      package.json
      vite.config.ts
      index.html
      src/
        main.ts
        game.ts

  examples/
    platformer/
    third-person/
    arena-shooter/

  docs/
    engine/
    editor/
    scripting/
    components/
    mcp/
    plugins/
    exporting/
    ai-rules/
```

---

# 5. Project File Structure

Each user game project should be file-based and portable.

```txt
MyGame/
  project.arcforge.json

  .arcforge/
    project-id.json
    mcp.policy.json
    mcp.clients.json
    mcp.audit.log
    docs.index.json
    cache/
    preview/
    build/

  scenes/
    Main.scene.json
    Menu.scene.json

  prefabs/
    Player.prefab.json
    Enemy.prefab.json
    Coin.prefab.json

  scripts/
    player.controller.ts
    enemy.ai.ts
    coin.collectable.ts
    game.manager.ts

  assets/
    models/
    textures/
    audio/
    materials/

  plugins/
    inventory/
    dialogue/
    quest-system/

  docs/
    GAME_DESIGN.md
    AI_NOTES.md
    PROJECT_CONVENTIONS.md
```

---

# 6. Project Manifest

`project.arcforge.json`

```json
{
  "name": "MyGame",
  "engineVersion": "0.1.0",
  "defaultScene": "scenes/Main.scene.json",
  "render": {
    "backend": "webgl",
    "antialias": true,
    "shadows": true,
    "toneMapping": "aces"
  },
  "physics": {
    "enabled": true,
    "backend": "rapier"
  },
  "scripting": {
    "language": "typescript",
    "strict": true
  },
  "export": {
    "web": true,
    "editableThreeProject": true
  }
}
```

---

# 7. Runtime Engine Design

## 7.1 Runtime Responsibilities

The runtime engine handles:

```txt
Scene loading
Entity/component lifecycle
Three.js object synchronization
Asset loading
Input
Audio
Physics stepping
Script execution
Animation
Events
Runtime UI
Game loop
```

The runtime must not depend on the editor.

```txt
Allowed:
runtime → schemas
runtime → engine core
runtime → project data

Forbidden:
runtime → editor panels
runtime → Tauri
runtime → MCP server
runtime → React
```

## 7.2 Game Loop

```txt
requestAnimationFrame
  ↓
read input
  ↓
run update(dt)
  ↓
run fixedUpdate(fixedDt) zero or more times
  ↓
step physics
  ↓
sync ECS state to Three.js
  ↓
render frame
```

## 7.3 ECS Model

Entities are IDs. Components are data. Systems operate on component sets.

```ts
type EntityId = string;

type EntityData = {
  id: EntityId;
  name: string;
  parent: EntityId | null;
  components: Record<string, unknown>;
};
```

Core components:

```txt
core.transform
render.mesh
render.camera
render.light
physics.rigidbody
physics.collider
script.behaviour
audio.source
animation.animator
ui.canvas
```

Game-specific components should use namespaced IDs:

```txt
game.health
game.inventory
game.enemy_ai
game.coin
game.weapon
```

---

# 8. Scene Format

Scene files should be plain JSON.

`scenes/Main.scene.json`

```json
{
  "version": 1,
  "name": "Main",
  "entities": [
    {
      "id": "player",
      "name": "Player",
      "parent": null,
      "components": {
        "core.transform": {
          "position": [0, 1, 0],
          "rotation": [0, 0, 0],
          "scale": [1, 1, 1]
        },
        "render.mesh": {
          "asset": "assets/models/player.glb"
        },
        "physics.rigidbody": {
          "type": "dynamic",
          "mass": 1
        },
        "script.behaviour": {
          "module": "scripts/player.controller.ts"
        }
      }
    }
  ]
}
```

Scene files are the source of truth.

The editor, runtime, exporter, and MCP server must all read the same scene format.

---

# 9. Prefab Format

`prefabs/Coin.prefab.json`

```json
{
  "version": 1,
  "name": "Coin",
  "root": {
    "id": "coin_root",
    "name": "Coin",
    "components": {
      "core.transform": {
        "position": [0, 0, 0],
        "rotation": [0, 0, 0],
        "scale": [1, 1, 1]
      },
      "render.mesh": {
        "asset": "assets/models/coin.glb"
      },
      "script.behaviour": {
        "module": "scripts/coin.collectable.ts"
      }
    },
    "children": []
  }
}
```

Prefab instances in scenes should reference prefab source plus overrides:

```json
{
  "id": "coin_001",
  "prefab": "prefabs/Coin.prefab.json",
  "overrides": {
    "core.transform.position": [4, 1, 2]
  }
}
```

---

# 10. Component Definition System

Every component must have:

```txt
ID
schema
defaults
editor inspector metadata
runtime adapter
documentation
AI usage notes
```

Example:

```ts
export const HealthComponent = defineComponent({
  id: "game.health",
  displayName: "Health",
  schema: z.object({
    max: z.number().min(1).default(100),
    current: z.number().min(0).default(100),
    invincible: z.boolean().default(false),
  }),
  defaults: {
    max: 100,
    current: 100,
    invincible: false,
  },
  inspector: [
    { key: "max", label: "Max Health", type: "number" },
    { key: "current", label: "Current Health", type: "number" },
    { key: "invincible", label: "Invincible", type: "boolean" },
  ],
  docs: {
    summary: "Adds hit points and damage state to an entity.",
    aiUsage: "Use this for players, enemies, destructible objects, and bosses.",
  },
});
```

The MCP server should expose component schemas to AI through documentation resources and tools.

---

# 11. Scripting API

Scripts are TypeScript modules that use a restricted engine API.

Example:

```ts
import { Behaviour, GameContext } from "@arcforge/runtime";

export default class PlayerController extends Behaviour {
  speed = 5;

  update(ctx: GameContext) {
    const move = ctx.input.getVector("move");
    ctx.entity.transform.translate(
      move.x * this.speed * ctx.time.delta,
      0,
      move.y * this.speed * ctx.time.delta
    );
  }
}
```

Scripts may access:

```txt
ctx.time
ctx.input
ctx.entity
ctx.scene
ctx.assets
ctx.audio
ctx.physics
ctx.events
ctx.debug
```

Scripts may not access:

```txt
private engine internals
editor internals
Tauri APIs
raw filesystem APIs
Node APIs
MCP server internals
```

---

# 12. Editor Architecture

## 12.1 Editor Panels

The Tauri editor includes:

```txt
Scene Viewport
Hierarchy Panel
Inspector Panel
Asset Browser
Prefab Editor
Script Panel
Console Panel
Build Panel
MCP Access Panel
AI Diff Review Panel
Profiler Panel
Project Settings
```

## 12.2 Command System

All mutations must go through editor commands.

```ts
interface EditorCommand {
  id: string;
  label: string;
  execute(ctx: EditorContext): Promise<void>;
  undo(ctx: EditorContext): Promise<void>;
}
```

Command examples:

```txt
CreateEntityCommand
DeleteEntityCommand
RenameEntityCommand
AddComponentCommand
RemoveComponentCommand
UpdateComponentCommand
CreatePrefabCommand
InstantiatePrefabCommand
CreateScriptCommand
EditScriptCommand
ImportAssetCommand
SetProjectSettingCommand
```

Critical rule:

```txt
User UI actions and AI MCP actions must call the same command system.
```

This keeps undo/redo, validation, audit logs, and live preview consistent.

---

# 13. MCP Integration

## 13.1 MCP Role

MCP is the AI interface for the project.

MCP should expose controlled tools, resources, and prompts. MCP tools let models invoke external actions; MCP resources provide contextual data to models; MCP prompts provide structured reusable workflows.

The MCP server should not be the engine. It should be a project control layer.

```txt
AI client
  ↓
MCP tool/resource/prompt
  ↓
policy check
  ↓
editor command
  ↓
project files
  ↓
live preview event
```

## 13.2 MCP Transport Modes

Support two modes.

### Attached Mode

The Tauri app is open.

```txt
AI editor → MCP server → Tauri bridge → editor command system → live preview
```

Use this when the user wants to see the result immediately in the app.

### Headless Mode

The Tauri app is closed.

```txt
AI editor → MCP server → project files
```

When the Tauri app opens later, it loads the changed project.

## 13.3 MCP Server Deployment

Recommended MVP:

```txt
TypeScript MCP server launched as a sidecar or CLI.
```

Supported launch modes:

```txt
arcforge-mcp --project /path/to/MyGame
arcforge-mcp --project /path/to/MyGame --attached
arcforge-mcp --project /path/to/MyGame --readonly
```

Editor configuration example:

```json
{
  "mcpServers": {
    "arcforge-my-game": {
      "command": "arcforge-mcp",
      "args": ["--project", "C:/Users/Isaac/Documents/MyGame"]
    }
  }
}
```

---

# 14. MCP Tool Specification

## 14.1 Project Tools

### `project.get_info`

Returns project metadata.

Input:

```json
{}
```

Output:

```json
{
  "name": "MyGame",
  "engineVersion": "0.1.0",
  "defaultScene": "scenes/Main.scene.json"
}
```

### `project.list_files`

Lists project files within allowed folders.

Input:

```json
{
  "kind": "scene | prefab | script | asset | docs | all"
}
```

### `project.validate`

Runs project validation.

Input:

```json
{
  "level": "fast | full"
}
```

Output:

```json
{
  "ok": true,
  "errors": [],
  "warnings": []
}
```

---

## 14.2 Scene Tools

### `scene.list`

Lists scenes.

Input:

```json
{}
```

### `scene.open`

Returns a scene summary.

Input:

```json
{
  "scene": "scenes/Main.scene.json"
}
```

### `scene.get_entity`

Returns one entity.

Input:

```json
{
  "scene": "scenes/Main.scene.json",
  "entityId": "player"
}
```

### `scene.create_entity`

Creates an entity through the command system.

Input:

```json
{
  "scene": "scenes/Main.scene.json",
  "name": "EnemySpawner",
  "parent": null,
  "components": {
    "core.transform": {
      "position": [0, 0, -10],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1]
    }
  }
}
```

### `scene.update_component`

Updates component data.

Input:

```json
{
  "scene": "scenes/Main.scene.json",
  "entityId": "player",
  "component": "game.health",
  "patch": {
    "max": 150
  }
}
```

### `scene.delete_entity`

Deletes an entity.

Input:

```json
{
  "scene": "scenes/Main.scene.json",
  "entityId": "enemy_001"
}
```

---

## 14.3 Prefab Tools

```txt
prefab.list
prefab.read
prefab.create
prefab.update
prefab.instantiate
prefab.validate
```

Example:

```json
{
  "tool": "prefab.instantiate",
  "arguments": {
    "scene": "scenes/Main.scene.json",
    "prefab": "prefabs/Coin.prefab.json",
    "position": [5, 1, 2]
  }
}
```

---

## 14.4 Script Tools

```txt
script.list
script.read
script.create
script.edit
script.typecheck
script.explain_errors
```

### `script.create`

Input:

```json
{
  "path": "scripts/enemy.ai.ts",
  "purpose": "Enemy chase behavior",
  "content": "..."
}
```

Before creating or editing scripts, the AI should call documentation tools for:

```txt
docs.search
docs.read
component.list
component.get_schema
script.get_api
```

---

## 14.5 Asset Tools

```txt
asset.list
asset.inspect
asset.import
asset.assign_to_entity
asset.get_import_settings
asset.update_import_settings
```

Asset tools must be scoped to the project asset folder.

Forbidden:

```txt
Importing from arbitrary system paths without user approval
Deleting source files outside the project
Running arbitrary conversion binaries without permission
```

---

## 14.6 Build and Preview Tools

```txt
build.preview
build.stop_preview
build.get_errors
build.get_console
build.export_web
build.export_three_project
```

### `build.preview`

Starts or refreshes the preview.

Input:

```json
{
  "scene": "scenes/Main.scene.json"
}
```

### `build.export_web`

Input:

```json
{
  "output": "dist-web",
  "optimize": true
}
```

### `build.export_three_project`

Input:

```json
{
  "output": "exports/MyGameThreeProject",
  "includeEngineSource": true,
  "includeEditorMetadata": false
}
```

---

# 15. Documentation System for AI

## 15.1 Goal

The MCP server must let AI pull project and engine docs before editing.

This is mandatory.

The AI should be able to ask:

```txt
What components exist?
How do I create a player controller?
What is the Transform schema?
How do prefabs work?
What tools am I allowed to call?
What are this project’s conventions?
How do I export?
What are common performance rules?
```

## 15.2 Documentation Sources

The documentation system indexes:

```txt
Engine docs
Component schemas
Script API docs
Editor command docs
MCP tool docs
Project docs
Plugin docs
Asset import docs
Export docs
AI rules
Performance rules
Selected external references
```

Project docs:

```txt
MyGame/docs/GAME_DESIGN.md
MyGame/docs/AI_NOTES.md
MyGame/docs/PROJECT_CONVENTIONS.md
```

Engine docs:

```txt
docs/engine/
docs/scripting/
docs/components/
docs/plugins/
docs/exporting/
docs/ai-rules/
```

Generated docs:

```txt
.generated/docs/components.json
.generated/docs/script-api.json
.generated/docs/mcp-tools.json
```

## 15.3 MCP Documentation Resources

Expose docs as MCP resources.

Resource URI examples:

```txt
arcforge://docs/engine/overview
arcforge://docs/scripting/behaviour
arcforge://docs/components/core.transform
arcforge://docs/components/render.mesh
arcforge://docs/mcp/tools
arcforge://docs/project/conventions
arcforge://docs/project/game-design
arcforge://schemas/scene
arcforge://schemas/prefab
arcforge://schemas/component/game.health
```

Resources are appropriate here because MCP resources are designed to share contextual data, such as files or application-specific information, with models.

## 15.4 MCP Documentation Tools

### `docs.search`

Searches all indexed docs.

Input:

```json
{
  "query": "how to create a collectable coin",
  "scope": "all | engine | project | scripting | components | mcp | plugins",
  "limit": 8
}
```

Output:

```json
{
  "results": [
    {
      "title": "Collectable Component",
      "uri": "arcforge://docs/components/game.collectable",
      "snippet": "Use game.collectable for objects that trigger pickup behavior..."
    }
  ]
}
```

### `docs.read`

Reads one documentation resource.

Input:

```json
{
  "uri": "arcforge://docs/scripting/behaviour"
}
```

### `docs.list_sources`

Lists available doc sources.

Input:

```json
{}
```

### `docs.refresh_index`

Rebuilds the project docs index.

Input:

```json
{
  "includeProjectDocs": true,
  "includeGeneratedSchemas": true
}
```

### `docs.get_relevant`

Returns docs relevant to a task.

Input:

```json
{
  "task": "Add a third-person player with camera follow and coin pickup."
}
```

Output should include:

```txt
Relevant components
Relevant scripts
Relevant examples
Known project conventions
Allowed MCP tools
Potential warnings
```

## 15.5 Required AI Behavior

Before making non-trivial changes, the AI should call:

```txt
docs.get_relevant
project.get_info
component.list
scene.open
```

Before writing scripts, the AI should call:

```txt
script.get_api
docs.read arcforge://docs/scripting/behaviour
script.typecheck after editing
```

Before adding components, the AI should call:

```txt
component.get_schema
```

Before exporting, the AI should call:

```txt
project.validate
build.get_errors
```

## 15.6 Documentation Index Format

`.arcforge/docs.index.json`

```json
{
  "version": 1,
  "generatedAt": "2026-07-09T00:00:00Z",
  "sources": [
    {
      "uri": "arcforge://docs/scripting/behaviour",
      "title": "Behaviour Scripting API",
      "kind": "markdown",
      "path": "docs/scripting/behaviour.md",
      "tags": ["scripting", "runtime", "api"]
    }
  ]
}
```

## 15.7 AI-Facing Rules File

`docs/ai-rules/ENGINE_RULES.md`

```md
# Engine Rules for AI

Prefer these change types in order:

1. Scene JSON edits through MCP tools.
2. Prefab edits through MCP tools.
3. New isolated scripts.
4. New game components.
5. New plugins.
6. Engine core modifications only when explicitly requested.

Do not directly modify:

- engine/render/private
- engine/core/game-loop
- generated files
- build output
- package lockfiles unless installing dependencies was approved
```

---

# 16. MCP Prompts

Expose reusable MCP prompts.

MCP prompts are designed as structured templates that clients can discover and retrieve for workflows.

Prompt examples:

```txt
prompt.create_game_prototype
prompt.add_gameplay_feature
prompt.fix_runtime_error
prompt.optimize_scene
prompt.export_game
prompt.explain_project
prompt.create_component
prompt.create_plugin
```

## 16.1 `prompt.add_gameplay_feature`

Arguments:

```json
{
  "feature": "string",
  "scene": "string"
}
```

Prompt behavior:

```txt
1. Read project info.
2. Search relevant docs.
3. Inspect scene.
4. Plan changes.
5. Apply scene/prefab/script changes.
6. Run validation.
7. Run typecheck.
8. Summarize diff.
```

## 16.2 `prompt.fix_runtime_error`

Arguments:

```json
{
  "error": "string",
  "scene": "string"
}
```

Prompt behavior:

```txt
1. Read build errors.
2. Read related script.
3. Search docs.
4. Apply minimal fix.
5. Typecheck.
6. Summarize result.
```

---

# 17. Per-Project MCP Authorization

## 17.1 Goal

Each project controls which AI clients/editors can access it.

Authorization must be:

```txt
Per-project
Scoped
Revocable
Audited
Safe by default
```

## 17.2 Project MCP Files

```txt
MyGame/.arcforge/
  mcp.policy.json
  mcp.clients.json
  mcp.audit.log
```

## 17.3 `mcp.policy.json`

```json
{
  "mcp": {
    "enabled": true,
    "defaultMode": "ask",
    "allowedTools": {
      "project.read": "allow",
      "docs.read": "allow",
      "docs.search": "allow",
      "scene.read": "allow",
      "scene.write": "ask",
      "prefab.write": "ask",
      "script.read": "allow",
      "script.write": "ask",
      "asset.import": "ask",
      "build.preview": "allow",
      "build.export": "ask",
      "dependency.install": "deny",
      "shell.run": "deny",
      "engine.modify": "deny"
    }
  }
}
```

## 17.4 Scopes

```txt
project:read
project:write
docs:read
scene:read
scene:write
prefab:read
prefab:write
script:read
script:write
asset:read
asset:import
build:preview
build:export
plugin:create
dependency:install
shell:run
engine:modify
```

Default trusted client scopes:

```txt
project:read
docs:read
scene:read
script:read
build:preview
```

Default write scopes require approval:

```txt
scene:write
prefab:write
script:write
asset:import
build:export
```

Dangerous scopes denied by default:

```txt
shell:run
dependency:install
engine:modify
```

## 17.5 Client Registry

`mcp.clients.json`

```json
{
  "trustedClients": [
    {
      "clientId": "cursor",
      "displayName": "Cursor",
      "scopes": [
        "project:read",
        "docs:read",
        "scene:read",
        "scene:write",
        "script:read",
        "script:write",
        "build:preview"
      ],
      "approvedAt": "2026-07-09T00:00:00Z",
      "lastUsedAt": "2026-07-09T00:00:00Z"
    }
  ]
}
```

Do not store raw secrets in this file.

Tokens should be stored in:

```txt
OS keychain
or user app data directory
```

## 17.6 Local Pairing Flow

MVP authorization should use local pairing.

```txt
1. User opens project in Tauri app.
2. User opens Project Settings → MCP Access.
3. User clicks "Connect Editor".
4. App shows editor config and a temporary pairing code.
5. User configures editor MCP server.
6. Editor starts MCP server.
7. MCP server asks app to approve client.
8. App shows permission prompt.
9. User approves scopes.
10. MCP server stores scoped token.
11. Future requests use that scoped token.
```

## 17.7 OAuth Future Mode

For remote HTTP MCP, use OAuth-style authorization.

The MCP authorization spec defines authorization for HTTP-based transports and uses OAuth concepts for restricted MCP servers.

Future architecture:

```txt
MCP server = protected resource server
Tauri app = local authorization server
Editor = OAuth client
Project token = scoped access token
```

---

# 18. Live Preview Bridge

## 18.1 Goal

When an AI edits the project from an external editor, the Tauri app must show the result.

## 18.2 Event Flow

```txt
MCP tool call
  ↓
authorization check
  ↓
schema validation
  ↓
editor command
  ↓
project files updated
  ↓
event emitted
  ↓
Tauri app receives event
  ↓
preview updates
```

## 18.3 Event Types

```txt
project.changed
scene.changed
entity.created
entity.updated
entity.deleted
component.added
component.updated
component.removed
script.changed
asset.imported
build.started
build.finished
build.failed
mcp.permission_requested
mcp.client_connected
mcp.client_revoked
```

Example:

```json
{
  "type": "scene.changed",
  "scene": "scenes/Main.scene.json",
  "changedEntities": ["player", "coin_001"],
  "source": "mcp",
  "client": "cursor"
}
```

## 18.4 Preview Reload Strategy

Use three levels:

```txt
Hot patch:
  update component/entity data without full reload

Scene reload:
  reload current scene when structural changes are large

Runtime restart:
  restart preview when scripts, plugins, or engine settings change
```

---

# 19. AI Diff Review

The app should show a diff panel for AI changes.

For every MCP write operation:

```txt
Show what changed
Show which client made the change
Show which MCP tool was used
Show validation result
Allow accept/revert
Allow trust similar action next time
```

For high-risk actions:

```txt
Require explicit approval before applying.
```

High-risk actions:

```txt
Deleting many entities
Editing more than N files
Adding dependencies
Modifying engine packages
Exporting outside project folder
Running shell commands
```

---

# 20. Audit Logging

Every MCP action must be logged.

`.arcforge/mcp.audit.log`

Example:

```json
{
  "time": "2026-07-09T00:00:00Z",
  "clientId": "cursor",
  "tool": "scene.update_component",
  "scope": "scene:write",
  "status": "allowed",
  "scene": "scenes/Main.scene.json",
  "summary": "Updated player health max from 100 to 150"
}
```

Audit log requirements:

```txt
Append-only
Human-readable summaries
No raw secrets
Project-local
Can be viewed in app
```

---

# 21. Export System

## 21.1 Export Playable Web Build

Output:

```txt
dist/
  index.html
  assets/
  game.js
  game.css
  project.data.json
```

Includes:

```txt
Three.js
runtime engine
compiled scripts
scene data
assets
```

Excludes:

```txt
Tauri
MCP server
React editor UI
inspector panels
editor command system
AI docs
audit logs
```

## 21.2 Export Editable Three.js Project

Output:

```txt
MyGameThreeProject/
  package.json
  vite.config.ts
  index.html
  src/
    main.ts
    game.ts
    runtime/
    scenes/
    prefabs/
    scripts/
  public/
    assets/
  README.md
```

This project should be usable with:

```bash
npm install
npm run dev
npm run build
```

## 21.3 Export Rules

The exporter must:

```txt
Validate scenes
Validate prefabs
Typecheck scripts
Resolve asset paths
Copy needed assets only
Tree-shake editor-only code
Generate package.json
Generate README
Create build report
```

---

# 22. Plugin System

## 22.1 Plugin Structure

```txt
plugins/inventory/
  plugin.arcforge.json
  components/
    inventory.component.ts
    item.component.ts
  systems/
    inventory.system.ts
  scripts/
    pickup.ts
  docs/
    inventory.md
    ai-usage.md
```

## 22.2 Plugin Manifest

```json
{
  "id": "game.inventory",
  "name": "Inventory",
  "version": "1.0.0",
  "components": ["game.inventory", "game.item"],
  "systems": ["InventorySystem"],
  "docs": ["docs/inventory.md", "docs/ai-usage.md"]
}
```

## 22.3 Plugin MCP Tools

```txt
plugin.list
plugin.read
plugin.create
plugin.validate
plugin.enable
plugin.disable
```

Creating plugins should require the `plugin:create` scope.

---

# 23. Build Validation

Validation layers:

```txt
JSON schema validation
Component schema validation
Scene reference validation
Prefab reference validation
Asset reference validation
Script typecheck
Dependency check
Runtime smoke test
Export dry run
```

MCP tools should never apply invalid scene/component data.

Bad AI output should fail safely:

```txt
MCP tool call rejected
Validation errors returned to AI
No project file modified
Audit log records failed attempt
```

---

# 24. Safety Rules

## 24.1 Forbidden by Default

```txt
Arbitrary shell execution
Writing outside project folder
Deleting project root
Editing generated output
Editing package lockfiles
Installing dependencies
Modifying engine internals
Uploading project data remotely
```

## 24.2 Require User Approval

```txt
Script write
Prefab write
Scene destructive edits
Asset imports from outside project
Exporting builds
Plugin creation
Dependency installation
Engine modifications
```

## 24.3 Allowed by Default

```txt
Read docs
Read component schemas
Read scene summaries
Read project metadata
Read script files
Run preview
Run validation
Run typecheck
```

---

# 25. Performance Requirements

The engine should support:

```txt
Instanced meshes
Static batching
Material reuse
Texture compression
GLB/glTF asset flow
LOD groups
Frustum culling
Object pooling
Fixed-step physics
Asset preloading
Lazy loading
Runtime profiler
Editor performance warnings
```

The editor should warn about:

```txt
Too many draw calls
Too many unique materials
Large uncompressed textures
Huge scene JSON files
Too many dynamic lights
Too many physics bodies
Missing LODs
Oversized scripts
```

---

# 26. MVP Roadmap

## Phase 1 — Runtime Foundation

```txt
TypeScript engine package
Scene JSON loader
Entity/component model
Transform component
Mesh component
Camera component
Light component
Basic render loop
```

## Phase 2 — Tauri Editor

```txt
Tauri shell
React editor UI
Three.js viewport
Hierarchy panel
Inspector panel
Asset browser
Scene save/load
Undo/redo command system
```

## Phase 3 — Scripting

```txt
Script component
Behaviour lifecycle
GameContext API
Script typechecking
Runtime error panel
```

## Phase 4 — Export

```txt
Playable web export
Editable Three.js/Vite project export
Asset copy pipeline
Build report
```

## Phase 5 — MCP Read-Only

```txt
MCP server sidecar
project.get_info
scene.list
scene.open
component.list
docs.search
docs.read
build.get_errors
```

## Phase 6 — MCP Write Tools

```txt
scene.create_entity
scene.update_component
prefab.create
script.create
script.edit
build.preview
AI diff review
Per-project permissions
```

## Phase 7 — Documentation System

```txt
Docs indexer
Generated component docs
Generated MCP tool docs
Project convention docs
docs.get_relevant
MCP resource URIs
AI required-docs workflow
```

## Phase 8 — Plugins and Advanced Features

```txt
Plugin system
Physics abstraction
Asset import settings
Profiler
Performance warnings
AI plugin creation
Remote/OAuth MCP mode
```

---

# 27. Example AI Workflow

User asks in external editor:

```txt
Create a simple collectathon prototype with a player, coins, timer, and win screen.
```

AI should do:

```txt
1. project.get_info
2. docs.get_relevant
3. scene.list
4. scene.open Main
5. component.list
6. component.get_schema for needed components
7. prefab.create Coin
8. script.create coin.collectable.ts
9. script.create game.manager.ts
10. scene.create_entity Player
11. scene.create_entity TimerUI
12. scene.create_entity WinScreen
13. build.preview
14. script.typecheck
15. project.validate
16. summarize diff
```

The Tauri app should show:

```txt
Connected MCP client
Changed files
Created entities
Typecheck result
Live preview
Accept/revert buttons
```

---

# 28. Non-Negotiable Architecture Rules

```txt
1. The runtime must not depend on the editor.
2. The exported game must not include MCP.
3. MCP write tools must call editor commands.
4. AI must be able to read docs through MCP.
5. Component schemas must drive inspector UI and MCP validation.
6. Project authorization must be per project.
7. Dangerous tools must be denied by default.
8. Scene and prefab files must be portable JSON.
9. Scripts must use the public scripting API only.
10. Exported projects must be normal Three.js/Vite projects.
```

---

# 29. Final System Summary

```txt
ArcForge is a Tauri desktop editor for building Three.js games.

The visual editor and external AI clients both modify projects through the same command system.

MCP provides the AI interface.

The MCP server exposes tools for actions, resources for docs/context, and prompts for workflows.

Per-project authorization controls what each editor or AI client can do.

The Tauri app shows live output through the preview bridge.

The exporter creates either a playable static web build or an editable Three.js/Vite project.

The AI is powerful because it can inspect docs, schemas, scenes, scripts, and build errors.

The codebase stays clean because the AI works through validated APIs instead of editing engine internals directly.
```
