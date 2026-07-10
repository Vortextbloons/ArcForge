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
