import * as THREE from "three";
import type { Mesh as MeshData } from "@threeforge/schemas";
import type { World } from "../ecs/World.js";
import type { RenderBridge } from "./RenderBridge.js";
import { replaceObject } from "./TransformSyncSystem.js";

const MESH_ID = "render.mesh";

/**
 * Creates or updates Three.js meshes from render.mesh components.
 * MVP: built-in primitives only (asset loading comes later).
 */
export function syncMeshes(world: World, bridge: RenderBridge): void {
  for (const entity of world.query(MESH_ID)) {
    const data = world.getComponent<MeshData>(entity.id, MESH_ID)!;
    const existing = bridge.getObject(entity.id);

    if (existing && isMatchingMesh(existing, data)) {
      updateMeshMaterial(existing as THREE.Mesh, data);
      continue;
    }

    const mesh = createPrimitiveMesh(data);
    mesh.name = entity.name;
    replaceObject(bridge, entity.id, mesh, existing);
  }
}

function createPrimitiveMesh(data: MeshData): THREE.Mesh {
  const geometry = createGeometry(data.primitive ?? "box");
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(data.color ?? "#888888"),
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
  return (
    (object as THREE.Mesh).isMesh === true &&
    object.userData.meshKey === meshKey(data)
  );
}

function updateMeshMaterial(mesh: THREE.Mesh, data: MeshData): void {
  mesh.castShadow = data.castShadow ?? true;
  mesh.receiveShadow = data.receiveShadow ?? true;
  const material = mesh.material;
  if (material instanceof THREE.MeshStandardMaterial) {
    material.color.set(data.color ?? "#888888");
  }
}
