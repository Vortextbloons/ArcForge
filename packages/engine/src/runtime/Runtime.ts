import type { Scene } from "@threeforge/schemas";
import { World } from "../ecs/World.js";
import { ComponentRegistry } from "../ecs/ComponentRegistry.js";
import {
  RenderBridge,
  type RendererOptions,
  syncTransforms,
  syncMeshes,
  syncCameras,
  syncLights,
} from "../render/index.js";
import { loadScene, worldToScene } from "./loadScene.js";
import { GameLoop, type TimeState } from "./GameLoop.js";

export interface RuntimeOptions extends RendererOptions {
  fixedDelta?: number;
}

/**
 * Full runtime player: loads scenes, runs the game loop, syncs to Three.js.
 */
export class Runtime {
  readonly world: World;
  readonly registry: ComponentRegistry;
  readonly bridge: RenderBridge;
  readonly loop: GameLoop;

  private sceneName = "Untitled";
  private sceneVersion = 1;
  private dirtyRender = true;

  constructor(options: RuntimeOptions = {}) {
    this.world = new World();
    this.registry = ComponentRegistry.withCore();
    this.bridge = new RenderBridge(options);
    this.loop = new GameLoop({ fixedDelta: options.fixedDelta });

    this.loop.setUpdate((_time) => {
      // Script update hooks will plug in here (Phase 3).
    });
    this.loop.setFixedUpdate((_time) => {
      // Physics + fixed scripts (later phases).
    });
    this.loop.setRender((_time) => {
      this.syncAndRender();
    });
  }

  /** Load scene JSON into this runtime (replaces current world contents). */
  load(data: unknown): Scene {
    this.clearVisuals();
    const loaded = loadScene(data, {
      world: this.world,
      registry: this.registry,
    });
    this.sceneName = loaded.scene.name;
    this.sceneVersion = loaded.scene.version;
    this.dirtyRender = true;
    this.syncAndRender();
    return this.toScene();
  }

  toScene(): Scene {
    return worldToScene(this.world, this.sceneName, this.sceneVersion);
  }

  start(): void {
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
  }

  setSize(width: number, height: number): void {
    this.bridge.setSize(width, height);
    this.dirtyRender = true;
  }

  /** Mark world dirty so the next frame rebuilds Three.js objects. */
  markDirty(): void {
    this.dirtyRender = true;
  }

  /** Single-step sync for editor viewport without running the loop. */
  tickOnce(time?: Partial<TimeState>): void {
    void time;
    this.syncAndRender();
  }

  dispose(): void {
    this.stop();
    this.clearVisuals();
    this.world.clear();
    this.bridge.dispose();
  }

  private syncAndRender(): void {
    // Rebuild mesh/light/camera objects when dirty; transforms every frame.
    if (this.dirtyRender) {
      syncMeshes(this.world, this.bridge);
      syncLights(this.world, this.bridge);
      syncCameras(this.world, this.bridge);
      this.dirtyRender = false;
    }
    syncTransforms(this.world, this.bridge);
    // Aim lights after transforms so core.transform position wins.
    syncLights(this.world, this.bridge);
    this.bridge.render();
  }

  private clearVisuals(): void {
    for (const entity of this.world.all()) {
      this.bridge.removeObject(entity.id);
    }
  }
}
