import * as THREE from "three";
import type { Mesh as MeshData } from "@arcforge/schemas";
import type { World } from "../ecs/World.js";
import type { RenderBridge } from "./RenderBridge.js";
import { replaceObject } from "./TransformSyncSystem.js";
import type { AssetManager } from "../assets/AssetManager.js";

const MESH_ID = "render.mesh";

/**
 * Creates or updates Three.js meshes from render.mesh components.
 * MVP: built-in primitives only (asset loading comes later).
 */
export function syncMeshes(world: World, bridge: RenderBridge, assets?: AssetManager): void {
  for (const entity of world.query(MESH_ID)) {
    const data = world.getComponent<MeshData>(entity.id, MESH_ID)!;
    const existing = bridge.getObject(entity.id);

    if (existing && isMatchingMesh(existing, data)) {
      if (data.asset) {
        if (!existing.userData.assetLoading) applyModelSettings(existing, data, assets);
      } else {
        updateMeshMaterial(existing as THREE.Mesh, data, assets);
      }
      continue;
    }

    if (data.asset && assets) {
      const placeholder = createAssetPlaceholder(data, entity.name);
      replaceObject(bridge, entity.id, placeholder, existing);
      void assets
        .instantiateModel(data.asset)
        .then((model) => {
          const current = world.getComponent<MeshData>(entity.id, MESH_ID);
          if (!current || meshKey(current) !== meshKey(data)) return;
          model.name = entity.name;
          model.userData.meshKey = meshKey(data);
          applyModelSettings(model, data, assets);
          replaceObject(bridge, entity.id, model, bridge.getObject(entity.id));
        })
        .catch((error: unknown) => {
          placeholder.userData.assetError = error instanceof Error ? error.message : String(error);
        });
      continue;
    }

    const mesh = createPrimitiveMesh(data);
    mesh.name = entity.name;
    replaceObject(bridge, entity.id, mesh, existing);
  }
}

function createAssetPlaceholder(data: MeshData, name: string): THREE.Object3D {
  const placeholder = new THREE.Object3D();
  placeholder.name = `${name} (loading)`;
  placeholder.userData.meshKey = meshKey(data);
  placeholder.userData.assetLoading = true;
  return placeholder;
}

function applyModelSettings(model: THREE.Object3D, data: MeshData, assets?: AssetManager): void {
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = data.castShadow ?? true;
    mesh.receiveShadow = data.receiveShadow ?? true;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (material instanceof THREE.MeshStandardMaterial && data.color) {
        const base =
          typeof material.userData.arcforgeBaseColor === "number"
            ? material.userData.arcforgeBaseColor
            : material.color.getHex();
        material.userData.arcforgeBaseColor = base;
        material.color.setHex(base).multiply(new THREE.Color(data.color));
      }
      if (material instanceof THREE.MeshStandardMaterial) {
        updateStandardMaterial(material, data, assets);
      }
    }
  });
}

function createPrimitiveMesh(data: MeshData): THREE.Mesh {
  const geometry = createGeometry(data.primitive ?? "box");
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(data.color ?? "#888888"),
    metalness: data.metalness ?? 0,
    roughness: data.roughness ?? 1,
    emissive: new THREE.Color(data.emissive ?? "#000000"),
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = data.castShadow ?? true;
  mesh.receiveShadow = data.receiveShadow ?? true;
  mesh.userData.meshKey = meshKey(data);
  return mesh;
}

function createGeometry(primitive: MeshData["primitive"]): THREE.BufferGeometry {
  switch (primitive) {
    case "sphere":
      return new THREE.SphereGeometry(0.5, 32, 16);
    case "plane":
      return new THREE.PlaneGeometry(1, 1);
    case "cylinder":
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    case "capsule":
      return new THREE.CapsuleGeometry(0.35, 0.3, 8, 16);
    case "box":
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

function meshKey(data: MeshData): string {
  return `${data.primitive ?? "box"}|${data.asset ?? ""}`;
}

function isMatchingMesh(object: THREE.Object3D, data: MeshData): boolean {
  if (object.userData.meshKey !== meshKey(data)) return false;
  return data.asset ? true : (object as THREE.Mesh).isMesh === true;
}

function updateMeshMaterial(mesh: THREE.Mesh, data: MeshData, assets?: AssetManager): void {
  mesh.castShadow = data.castShadow ?? true;
  mesh.receiveShadow = data.receiveShadow ?? true;
  const material = mesh.material;
  if (material instanceof THREE.MeshStandardMaterial) {
    material.color.set(data.color ?? "#888888");
    updateStandardMaterial(material, data, assets);
  }
}

function updateStandardMaterial(
  material: THREE.MeshStandardMaterial,
  data: MeshData,
  assets?: AssetManager
): void {
  material.metalness = data.metalness ?? 0;
  material.roughness = data.roughness ?? 1;
  material.emissive.set(data.emissive ?? "#000000");
  loadMaterialTexture(material, "map", data.texture, assets, true);
  loadMaterialTexture(material, "normalMap", data.normalMap, assets, false);
  material.needsUpdate = true;
}

function loadMaterialTexture(
  material: THREE.MeshStandardMaterial,
  slot: "map" | "normalMap",
  path: string | undefined,
  assets: AssetManager | undefined,
  color: boolean
): void {
  const key = `${slot}Path`;
  if (!path || !assets) {
    if (material.userData[key]) {
      material[slot] = null;
      delete material.userData[key];
    }
    return;
  }
  if (material.userData[key] === path) return;
  material.userData[key] = path;
  void assets
    .loadTexture(path)
    .then((texture) => {
      if (material.userData[key] !== path) return;
      if (color) texture.colorSpace = THREE.SRGBColorSpace;
      material[slot] = texture;
      material.needsUpdate = true;
    })
    .catch(() => {
      if (material.userData[key] === path) delete material.userData[key];
    });
}
