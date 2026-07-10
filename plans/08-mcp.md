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
      "args": [
        "--project",
        "C:/Users/Isaac/Documents/MyGame"
      ]
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
