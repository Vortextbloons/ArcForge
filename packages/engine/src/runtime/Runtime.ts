import type { Scene } from "@arcforge/schemas";
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
import { InputAPI } from "../input/InputAPI.js";
import { EventBus } from "../scripting/EventBus.js";
import { RuntimeLogger } from "../scripting/RuntimeLogger.js";
import { ScriptRegistry } from "../scripting/ScriptRegistry.js";
import { ScriptSystem } from "../scripting/ScriptSystem.js";
import type { BehaviourConstructor } from "../scripting/Behaviour.js";

export interface RuntimeOptions extends RendererOptions {
  fixedDelta?: number;
  /** When true, Behaviour scripts run (play mode). Default false for editor edit mode. */
  scriptsEnabled?: boolean;
}

/**
 * Full runtime player: loads scenes, runs the game loop, syncs to Three.js.
 */
export class Runtime {
  readonly world: World;
  readonly registry: ComponentRegistry;
  readonly bridge: RenderBridge;
  readonly loop: GameLoop;
  readonly input: InputAPI;
  readonly events: EventBus;
  readonly logger: RuntimeLogger;
  readonly scripts: ScriptRegistry;
  readonly scriptSystem: ScriptSystem;

  private sceneName = "Untitled";
  private sceneVersion = 1;
  private dirtyRender = true;
  private disposed = false;

  constructor(options: RuntimeOptions = {}) {
    this.world = new World();
    this.registry = ComponentRegistry.withCore();
    this.bridge = new RenderBridge(options);
    this.loop = new GameLoop({ fixedDelta: options.fixedDelta });
    this.input = new InputAPI();
    this.events = new EventBus();
    this.logger = new RuntimeLogger();
    this.scripts = new ScriptRegistry();
    this.scriptSystem = new ScriptSystem(
      this.world,
      this.scripts,
      this.input,
      this.events,
      this.logger,
      () => this.toScene()
    );

    if (typeof window !== "undefined") {
      this.input.attach(window);
    }

    this.loop.setUpdate((time) => {
      this.scriptSystem.update(time);
    });
    this.loop.setFixedUpdate((time) => {
      this.scriptSystem.fixedUpdate(time);
    });
    this.loop.setRender((_time) => {
      this.syncAndRender();
      this.input.endFrame();
    });

    if (options.scriptsEnabled) {
      this.scriptSystem.setEnabled(true);
    }
  }

  registerScript(modulePath: string, ctor: BehaviourConstructor): void {
    this.scripts.register(modulePath, ctor);
    if (this.scriptSystem.enabled) {
      this.scriptSystem.syncInstances();
    }
  }

  registerScripts(entries: Record<string, BehaviourConstructor>): void {
    this.scripts.registerMany(entries);
    if (this.scriptSystem.enabled) {
      this.scriptSystem.syncInstances();
    }
  }

  setScriptsEnabled(enabled: boolean): void {
    this.scriptSystem.setEnabled(enabled);
  }

  get scriptsEnabled(): boolean {
    return this.scriptSystem.enabled;
  }

  /** Load scene JSON into this runtime (replaces current world contents). */
  load(data: unknown): Scene {
    this.scriptSystem.destroyAll();
    this.clearVisuals();
    const loaded = loadScene(data, {
      world: this.world,
      registry: this.registry,
    });
    this.sceneName = loaded.scene.name;
    this.sceneVersion = loaded.scene.version;
    this.dirtyRender = true;
    if (this.scriptSystem.enabled) {
      this.scriptSystem.syncInstances();
    }
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
    if (this.disposed) return;
    this.disposed = true;
    this.scriptSystem.setEnabled(false);
    this.stop();
    this.input.detach();
    this.events.clear();
    this.clearVisuals();
    this.world.clear();
    this.bridge.dispose();
  }

  private syncAndRender(): void {
    if (this.dirtyRender) {
      syncMeshes(this.world, this.bridge);
      syncLights(this.world, this.bridge);
      syncCameras(this.world, this.bridge);
      this.dirtyRender = false;
    }
    syncTransforms(this.world, this.bridge);
    syncLights(this.world, this.bridge);
    this.bridge.render();
  }

  private clearVisuals(): void {
    for (const entity of this.world.all()) {
      this.bridge.removeObject(entity.id);
    }
  }
}
