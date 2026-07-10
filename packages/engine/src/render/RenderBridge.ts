import * as THREE from "three";
import type { EntityId } from "../ecs/types.js";

export interface RendererOptions {
  canvas?: HTMLCanvasElement;
  antialias?: boolean;
  shadows?: boolean;
  clearColor?: number;
}

/**
 * Owns the Three.js renderer, scene graph roots, and entity → Object3D map.
 */
export class RenderBridge {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  private readonly objects = new Map<EntityId, THREE.Object3D>();
  private activeCamera: THREE.PerspectiveCamera | null = null;
  private readonly defaultCamera: THREE.PerspectiveCamera;

  constructor(options: RendererOptions = {}) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(options.clearColor ?? 0x1a1a1a);

    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: options.antialias ?? true,
    });
    this.renderer.setPixelRatio(typeof window !== "undefined" ? window.devicePixelRatio : 1);
    this.renderer.shadowMap.enabled = options.shadows ?? true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.defaultCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.defaultCamera.position.set(0, 2, 5);
    this.defaultCamera.lookAt(0, 0, 0);
    this.activeCamera = this.defaultCamera;
  }

  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    if (this.activeCamera) {
      this.activeCamera.aspect = width / Math.max(height, 1);
      this.activeCamera.updateProjectionMatrix();
    }
  }

  getObject(id: EntityId): THREE.Object3D | undefined {
    return this.objects.get(id);
  }

  setObject(id: EntityId, object: THREE.Object3D): void {
    const previous = this.objects.get(id);
    if (previous && previous !== object) {
      previous.removeFromParent();
      disposeObject(previous);
    }
    this.objects.set(id, object);
    if (!object.parent) {
      this.scene.add(object);
    }
  }

  removeObject(id: EntityId): void {
    const object = this.objects.get(id);
    if (!object) return;
    if (object === this.activeCamera) this.activeCamera = this.defaultCamera;
    object.removeFromParent();
    disposeObject(object);
    this.objects.delete(id);
  }

  ensureObject(id: EntityId, name: string): THREE.Object3D {
    let object = this.objects.get(id);
    if (!object) {
      object = new THREE.Object3D();
      object.name = name;
      this.setObject(id, object);
    }
    return object;
  }

  setActiveCamera(camera: THREE.PerspectiveCamera): void {
    this.activeCamera = camera;
  }

  getActiveCamera(): THREE.PerspectiveCamera {
    return this.activeCamera ?? this.defaultCamera;
  }

  render(): void {
    this.renderer.render(this.scene, this.getActiveCamera());
  }

  dispose(): void {
    for (const id of this.objects.keys()) {
      this.removeObject(id);
    }
    this.renderer.dispose();
  }
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      if (!mesh.userData.arcforgeSharedGeometry) mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material?.dispose();
      }
    }
  });
}
