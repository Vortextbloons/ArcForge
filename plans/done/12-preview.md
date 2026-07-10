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
