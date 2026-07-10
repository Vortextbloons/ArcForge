import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { AssetManager, type AssetLoader } from "./AssetManager.js";

describe("AssetManager", () => {
  it("caches source models and creates safe instances", async () => {
    const source = new THREE.Group();
    const sourceMesh = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial({ color: "red" })
    );
    source.add(sourceMesh);
    const loader: AssetLoader = {
      loadModel: vi.fn(async () => source),
      loadTexture: vi.fn(async () => new THREE.Texture()),
      loadAudio: vi.fn(async () => ({}) as AudioBuffer),
    };
    const assets = new AssetManager((path) => `/game/${path}`, loader);

    const first = await assets.instantiateModel("assets/models/ship.glb");
    const second = await assets.instantiateModel("assets/models/ship.glb");
    const firstMesh = first.children[0] as THREE.Mesh;
    const secondMesh = second.children[0] as THREE.Mesh;

    expect(loader.loadModel).toHaveBeenCalledOnce();
    expect(loader.loadModel).toHaveBeenCalledWith("/game/assets/models/ship.glb");
    expect(first).not.toBe(second);
    expect(firstMesh.geometry).toBe(secondMesh.geometry);
    expect(firstMesh.material).not.toBe(secondMesh.material);
    assets.clear();
  });
});
