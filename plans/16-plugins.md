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
