import * as THREE from "three";
import type { Light as LightData } from "@threeforge/schemas";
import type { World } from "../ecs/World.js";
import type { RenderBridge } from "./RenderBridge.js";
import { replaceObject } from "./TransformSyncSystem.js";

const LIGHT_ID = "render.light";

/**
 * Creates/updates Three.js lights from render.light components.
 */
export function syncLights(world: World, bridge: RenderBridge): void {
  for (const entity of world.query(LIGHT_ID)) {
    const data = world.getComponent<LightData>(entity.id, LIGHT_ID)!;
    const existing = bridge.getObject(entity.id);
    const light = ensureLight(existing, data, entity.name);

    if (light !== existing) {
      replaceObject(bridge, entity.id, light, existing);
    }
    applyLightProps(light, data, bridge);
  }
}

function ensureLight(
  existing: THREE.Object3D | undefined,
  data: LightData,
  name: string
): THREE.Light {
  const type = data.type ?? "directional";
  if (existing && matchesLightType(existing, type)) {
    return existing as THREE.Light;
  }

  let light: THREE.Light;
  switch (type) {
    case "point":
      light = new THREE.PointLight();
      break;
    case "ambient":
      light = new THREE.AmbientLight();
      break;
    case "hemi":
      light = new THREE.HemisphereLight();
      break;
    case "directional":
    default:
      light = new THREE.DirectionalLight();
      break;
  }
  light.name = name;
  light.userData.lightType = type;
  return light;
}

function matchesLightType(object: THREE.Object3D, type: string): boolean {
  return object.userData.lightType === type;
}

function applyLightProps(
  light: THREE.Light,
  data: LightData,
  bridge: RenderBridge
): void {
  light.color.set(data.color ?? "#ffffff");
  light.intensity = data.intensity ?? 1;

  if (light instanceof THREE.DirectionalLight) {
    light.castShadow = data.castShadow ?? false;
    const [dx, dy, dz] = data.direction ?? [0, -1, 0];
    // Keep target in the scene graph (world space), not as a light child.
    if (light.target.parent !== bridge.scene) {
      bridge.scene.add(light.target);
    }
    light.target.position.set(
      light.position.x + dx * 10,
      light.position.y + dy * 10,
      light.position.z + dz * 10
    );
    light.target.updateMatrixWorld();
  } else if (light instanceof THREE.PointLight) {
    light.castShadow = data.castShadow ?? false;
  }
}
