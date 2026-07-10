# Performance Rules

## Prefer

- Instanced meshes for repeated geometry
- Shared materials and textures
- Object pooling for frequent spawn/despawn
- Lazy loading of large assets
- Fixed-step physics updates
- Frustum culling (runtime default)

## Avoid

- Duplicate meshes with unique materials
- Uncompressed huge textures
- Unbounded per-frame allocations
- Too many dynamic lights
- Oversized scene JSON with duplicated data (use prefabs)

## Editor / AI warnings

When a task mentions draw calls, materials, lights, physics bodies, or texture size, search these docs and validate with `build.get_errors` after changes.
