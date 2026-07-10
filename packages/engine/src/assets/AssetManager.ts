import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type AssetUrlResolver = (projectPath: string) => string;

export interface AssetLoader {
  loadModel(url: string): Promise<THREE.Object3D>;
  loadTexture(url: string): Promise<THREE.Texture>;
  loadAudio(url: string): Promise<AudioBuffer>;
}

class ThreeAssetLoader implements AssetLoader {
  private readonly gltf = new GLTFLoader();
  private readonly textures = new THREE.TextureLoader();
  private readonly audio = new THREE.AudioLoader();

  async loadModel(url: string): Promise<THREE.Object3D> {
    const gltf = await this.gltf.loadAsync(url);
    gltf.scene.animations = gltf.animations;
    return gltf.scene;
  }

  loadTexture(url: string): Promise<THREE.Texture> {
    return this.textures.loadAsync(url);
  }

  loadAudio(url: string): Promise<AudioBuffer> {
    return this.audio.loadAsync(url);
  }
}

/** Cached project asset loading for models and textures. */
export class AssetManager {
  private readonly models = new Map<string, Promise<THREE.Object3D>>();
  private readonly textures = new Map<string, Promise<THREE.Texture>>();
  private readonly audio = new Map<string, Promise<AudioBuffer>>();
  private resolver: AssetUrlResolver;

  constructor(
    resolver: AssetUrlResolver = (path) => path,
    private readonly loader: AssetLoader = new ThreeAssetLoader()
  ) {
    this.resolver = resolver;
  }

  setResolver(resolver: AssetUrlResolver): void {
    this.resolver = resolver;
  }

  resolve(path: string): string {
    return this.resolver(normalizeAssetPath(path));
  }

  loadModel(path: string): Promise<THREE.Object3D> {
    const normalized = normalizeAssetPath(path);
    let pending = this.models.get(normalized);
    if (!pending) {
      pending = this.loader.loadModel(this.resolve(normalized));
      this.models.set(normalized, pending);
      pending.catch(() => this.models.delete(normalized));
    }
    return pending;
  }

  async instantiateModel(path: string): Promise<THREE.Object3D> {
    const source = await this.loadModel(path);
    const instance = source.clone(true);
    instance.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.userData.arcforgeSharedGeometry = true;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => material.clone())
        : mesh.material.clone();
    });
    return instance;
  }

  loadTexture(path: string): Promise<THREE.Texture> {
    const normalized = normalizeAssetPath(path);
    let pending = this.textures.get(normalized);
    if (!pending) {
      pending = this.loader.loadTexture(this.resolve(normalized));
      this.textures.set(normalized, pending);
      pending.catch(() => this.textures.delete(normalized));
    }
    return pending;
  }

  loadAudio(path: string): Promise<AudioBuffer> {
    const normalized = normalizeAssetPath(path);
    let pending = this.audio.get(normalized);
    if (!pending) {
      pending = this.loader.loadAudio(this.resolve(normalized));
      this.audio.set(normalized, pending);
      pending.catch(() => this.audio.delete(normalized));
    }
    return pending;
  }

  clear(): void {
    for (const pending of this.models.values()) {
      void pending.then(disposeObject).catch(() => undefined);
    }
    for (const pending of this.textures.values()) {
      void pending.then((texture) => texture.dispose()).catch(() => undefined);
    }
    this.models.clear();
    this.textures.clear();
    this.audio.clear();
  }
}

function normalizeAssetPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) material?.dispose();
  });
}
