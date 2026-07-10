# Plugins

Plugins live under `plugins/<folder>/` with a `plugin.arcforge.json` manifest.

## Manifest

```json
{
  "id": "game.inventory",
  "name": "Inventory",
  "version": "1.0.0",
  "enabled": true,
  "components": ["game.inventory"],
  "systems": [],
  "docs": ["docs/overview.md", "docs/ai-usage.md"]
}
```

## Component defs

JSON files in `components/*.component.json` (no engine compile required for MVP):

```json
{
  "id": "game.inventory",
  "displayName": "Inventory",
  "defaults": { "slots": 8 },
  "docs": { "summary": "...", "aiUsage": "..." },
  "inspector": [{ "key": "slots", "label": "Slots", "type": "number" }]
}
```

## MCP tools

| Tool | Purpose |
| --- | --- |
| `plugin.list` / `plugin.read` / `plugin.validate` | Inspect |
| `plugin.create` | Scaffold (requires `plugin.create` permission) |
| `plugin.enable` / `plugin.disable` | Toggle `enabled` |

Runtime registration: call `registerPluginComponents(registry, defs)` after loading defs from disk (editor/MCP side).

Systems hot-load is deferred; prefer Behaviour scripts for gameplay logic in MVP.
