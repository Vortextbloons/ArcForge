import type * as THREE from "three";
import type { Transform } from "@arcforge/schemas";
import type { World } from "../ecs/World.js";
import type { RenderBridge } from "./RenderBridge.js";

const TRANSFORM_ID = "core.transform";

/**
 * Syncs ECS transforms into Three.js Object3D local matrices.
 * Builds parent/child links from entity.parent.
 */
export function syncTransforms(world: World, bridge: RenderBridge): void {
  // Ensure all transform entities have an Object3D.
  for (const entity of world.query(TRANSFORM_ID)) {
    bridge.ensureObject(entity.id, entity.name);
  }

  // Parent hierarchy first (roots before children by repeated pass / topo).
  const ordered = topologicalEntities(world);
  for (const entity of ordered) {
    const transform = world.getComponent<Transform>(entity.id, TRANSFORM_ID);
    if (!transform) continue;

    const object = bridge.ensureObject(entity.id, entity.name);
    object.position.set(
      transform.position[0],
      transform.position[1],
      transform.position[2]
    );
    object.rotation.set(
      transform.rotation[0],
      transform.rotation[1],
      transform.rotation[2]
    );
    object.scale.set(
      transform.scale[0],
      transform.scale[1],
      transform.scale[2]
    );

    // Re-parent if needed.
    const desiredParent =
      entity.parent !== null
        ? bridge.getObject(entity.parent) ?? bridge.scene
        : bridge.scene;

    if (object.parent !== desiredParent) {
      desiredParent.add(object);
    }
  }
}

function topologicalEntities(world: World) {
  const entities = world.all();
  const depth = (id: string | null, seen = new Set<string>()): number => {
    if (id === null) return 0;
    if (seen.has(id)) return 0;
    seen.add(id);
    const parent = world.get(id)?.parent ?? null;
    return 1 + depth(parent, seen);
  };
  return [...entities].sort(
    (a, b) => depth(a.parent) - depth(b.parent) || a.id.localeCompare(b.id)
  );
}

/** Utility used by mesh/light systems when creating Object3D subclasses. */
export function replaceObject(
  bridge: RenderBridge,
  id: string,
  next: THREE.Object3D,
  previous?: THREE.Object3D
): void {
  if (previous && previous !== next) {
    // Preserve transform.
    next.position.copy(previous.position);
    next.rotation.copy(previous.rotation);
    next.scale.copy(previous.scale);
    // Move children.
    while (previous.children.length > 0) {
      next.add(previous.children[0]!);
    }
  }
  bridge.setObject(id, next);
}
