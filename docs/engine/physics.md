# Physics

ArcForge physics is an abstraction over backends.

## Manifest

```json
"physics": {
  "enabled": true,
  "backend": "rapier"
}
```

Use `"backend": "none"` to disable.

## Components

- `physics.rigidbody` — dynamic / kinematic / static
- `physics.collider` — box / sphere / capsule

## Scripting

```ts
ctx.physics.applyImpulse(ctx.entity.id, [0, 5, 0]);
ctx.physics.setLinearVelocity(ctx.entity.id, [0, 0, 0]);
```

## Runtime

```ts
const runtime = new Runtime({ physics: "rapier", scriptsEnabled: true });
await runtime.whenPhysicsReady();
```

Game loop order: `update` → `fixedUpdate` (scripts) → **physics step** → render.
