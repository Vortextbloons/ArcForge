import * as THREE from "three";
import type { Camera as CameraData } from "@arcforge/schemas";
import type { World } from "../ecs/World.js";
import type { RenderBridge } from "./RenderBridge.js";
import { replaceObject } from "./TransformSyncSystem.js";

const CAMERA_ID = "render.camera";

/**
 * Syncs perspective cameras and picks the primary active camera.
 */
export function syncCameras(world: World, bridge: RenderBridge): void {
  let primary: THREE.PerspectiveCamera | null = null;

  for (const entity of world.query(CAMERA_ID)) {
    const data = world.getComponent<CameraData>(entity.id, CAMERA_ID)!;
    const existing = bridge.getObject(entity.id);
    let camera: THREE.PerspectiveCamera;

    if (existing instanceof THREE.PerspectiveCamera) {
      camera = existing;
    } else {
      camera = new THREE.PerspectiveCamera(
        data.fov ?? 60,
        1,
        data.near ?? 0.1,
        data.far ?? 1000
      );
      camera.name = entity.name;
      replaceObject(bridge, entity.id, camera, existing);
    }

    camera.fov = data.fov ?? 60;
    camera.near = data.near ?? 0.1;
    camera.far = data.far ?? 1000;
    camera.updateProjectionMatrix();

    if (data.primary !== false && !primary) {
      primary = camera;
    }
  }

  if (primary) {
    bridge.setActiveCamera(primary);
  }
}
