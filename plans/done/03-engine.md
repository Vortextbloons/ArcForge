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
