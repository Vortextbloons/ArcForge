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
import {
  PhysicsAPI,
  createPhysicsBackend,
  type PhysicsBackendKind,
  NullPhysicsBackend,
} from "../physics/index.js";
import { FrameProfiler } from "../profiler/FrameProfiler.js";
import { EntityAPI } from "../scripting/EntityAPI.js";
import type { WorldEvent } from "../ecs/World.js";
import { PrefabRegistry } from "./PrefabRegistry.js";
import { AssetManager, type AssetUrlResolver } from "../assets/AssetManager.js";
import { AudioSystem } from "../audio/AudioSystem.js";
import { AnimationSystem } from "../animation/AnimationSystem.js";
import { UiSystem } from "../ui/UiSystem.js";
import { ParticleSystem } from "../render/ParticleSystem.js";
import { TimerAPI } from "../scripting/TimerAPI.js";
import { StorageAPI } from "../scripting/StorageAPI.js";
import { SceneAPI } from "./SceneAPI.js";
import { RuntimeExtensions } from "../plugins/RuntimeExtensions.js";

export interface RuntimeOptions extends RendererOptions {
  fixedDelta?: number;
  /** When true, Behaviour scripts run (play mode). Default false for editor edit mode. */
  scriptsEnabled?: boolean;
  /** Physics backend. Default "none". Use "rapier" after await createPhysicsBackend. */
  physics?: PhysicsBackendKind;
  assetUrlResolver?: AssetUrlResolver;
  storageNamespace?: string;
  /**
   * DOM target for pointer/keyboard input.
   * Prefer the viewport host in the editor so mouse look does not track over panels.
   * Defaults to `canvas`, then `window`.
   */
  inputTarget?: EventTarget;
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
  readonly physics: PhysicsAPI;
  readonly profiler: FrameProfiler;
  readonly entities: EntityAPI;
  readonly prefabs: PrefabRegistry;
  readonly assets: AssetManager;
  readonly audioSystem: AudioSystem;
  readonly audio: AudioSystem["api"];
  readonly animation: AnimationSystem;
  readonly particles: ParticleSystem;
  readonly ui: UiSystem;
  readonly timers: TimerAPI;
  readonly storage: StorageAPI;
  readonly scenes: SceneAPI;
  readonly extensions: RuntimeExtensions;

  private sceneName = "Untitled";
  private sceneVersion = 1;
  private dirtyRender = true;
  private disposed = false;
  private physicsReady: Promise<void>;

  constructor(options: RuntimeOptions = {}) {
    this.world = new World();
    this.registry = ComponentRegistry.withCore();
    this.bridge = new RenderBridge(options);
    this.loop = new GameLoop({ fixedDelta: options.fixedDelta });
    this.input = new InputAPI();
    this.events = new EventBus();
    this.logger = new RuntimeLogger();
    this.scripts = new ScriptRegistry();
    this.profiler = new FrameProfiler();
    this.physics = new PhysicsAPI(new NullPhysicsBackend());
    this.assets = new AssetManager(options.assetUrlResolver);
    this.audioSystem = new AudioSystem(this.assets);
    this.audio = this.audioSystem.api;
    this.animation = new AnimationSystem();
    this.particles = new ParticleSystem();
    this.ui = new UiSystem(this.bridge.renderer.domElement, this.events);
    this.timers = new TimerAPI();
    this.storage = new StorageAPI(options.storageNamespace);
    this.scenes = new SceneAPI();
    this.prefabs = new PrefabRegistry();
    this.entities = new EntityAPI(this.world, this.registry, this.prefabs);
    this.extensions = new RuntimeExtensions({
      world: this.world,
      entities: this.entities,
      input: this.input,
      events: this.events,
      assets: this.assets,
      audio: this.audio,
      physics: this.physics,
      render: this.bridge,
    });
    this.scriptSystem = new ScriptSystem(
      this.world,
      this.scripts,
      this.input,
      this.events,
      this.logger,
      () => this.toScene(),
      this.physics,
      this.entities,
      this.assets,
      this.audio,
      this.animation,
      this.timers,
      this.storage,
      this.scenes,
      this.extensions,
      this.particles
    );
    this.world.subscribe((event) => this.handleWorldEvent(event));

    const kind = options.physics ?? "none";
    this.physicsReady =
      kind === "none"
        ? Promise.resolve()
        : createPhysicsBackend(kind).then((backend) => {
            this.physics._setBackend(backend);
          });

    const inputTarget =
      options.inputTarget ??
      options.canvas ??
      (typeof window !== "undefined" ? window : undefined);
    if (inputTarget) {
      this.input.attach(inputTarget);
    }

    this.loop.setUpdate((time) => {
      const pendingScene = this.scenes._consumePending();
      if (pendingScene) this.load(pendingScene.scene, pendingScene.path);
      const t0 = this.profiler.beginSection();
      if (this.scriptSystem.enabled) {
        this.timers.update(time.delta);
        this.scriptSystem.update(time);
        this.extensions.update(time);
        this.animation.update(this.world, this.bridge, time.delta);
        this.particles.update(this.world, this.bridge, time.delta);
      }
      void this.profiler.endSection(t0);
    });
    this.loop.setFixedUpdate((time) => {
      const t0 = this.profiler.beginSection();
      if (this.scriptSystem.enabled) {
        this.scriptSystem.fixedUpdate(time);
        this.extensions.fixedUpdate(time);
      }
      const fixedMs = this.profiler.endSection(t0);

      const p0 = this.profiler.beginSection();
      if (this.scriptSystem.enabled) this.physics._step(this.world, time.fixedDelta);
      const physicsMs = this.profiler.endSection(p0);

      if (this.profiler.isEnabled) {
        this.profiler.record({
          ...this.profiler.snapshot(),
          fixedUpdateMs: fixedMs,
          physicsMs,
          entityCount: this.world.all().length,
          meshCount: this.world.query("render.mesh").length,
          lightCount: this.world.query("render.light").length,
          bodyCount: this.world.query("physics.rigidbody").length,
        });
      }
    });
    this.loop.setRender((time) => {
      const t0 = this.profiler.beginSection();
      this.extensions.render(time);
      this.syncAndRender();
      this.input.endFrame();
      const renderMs = this.profiler.endSection(t0);
      if (this.profiler.isEnabled) {
        const snap = this.profiler.snapshot();
        this.profiler.record({
          ...snap,
          renderMs,
          frameMs: snap.updateMs + snap.fixedUpdateMs + snap.physicsMs + renderMs,
        });
      }
    });

    if (options.scriptsEnabled) {
      this.scriptSystem.setEnabled(true);
    }
  }

  /** Resolves when the physics backend (if any) is ready. */
  whenPhysicsReady(): Promise<void> {
    return this.physicsReady;
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

  registerPrefab(path: string, data: unknown): void {
    this.prefabs.register(path, data);
  }

  registerPrefabs(entries: Record<string, unknown>): void {
    this.prefabs.registerMany(entries);
  }

  registerScene(path: string, data: unknown): void {
    this.scenes.register(path, data);
  }

  registerScenes(entries: Record<string, unknown>): void {
    this.scenes.registerMany(entries);
  }

  setAssetUrlResolver(resolver: AssetUrlResolver): void {
    this.assets.setResolver(resolver);
    this.dirtyRender = true;
  }

  setScriptsEnabled(enabled: boolean): void {
    this.scriptSystem.setEnabled(enabled);
    if (!enabled) {
      this.audioSystem.dispose();
      this.animation.dispose();
      this.particles.dispose();
      this.timers.clearAll();
    }
  }

  get scriptsEnabled(): boolean {
    return this.scriptSystem.enabled;
  }

  /** Load scene JSON into this runtime (replaces current world contents). */
  load(data: unknown, scenePath: string | null = null): Scene {
    this.scriptSystem.destroyAll();
    this.animation.dispose();
    this.particles.dispose();
    this.audioSystem.dispose();
    this.timers.clearAll();
    this.clearVisuals();
    const loaded = loadScene(data, {
      world: this.world,
      registry: this.registry,
      prefabs: this.prefabs,
    });
    this.sceneName = loaded.scene.name;
    this.sceneVersion = loaded.scene.version;
    this.scenes._setCurrent(scenePath);
    this.extensions.onSceneLoaded();
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
    this.physics._dispose();
    this.audioSystem.dispose();
    this.animation.dispose();
    this.particles.dispose();
    this.ui.dispose();
    this.timers.clearAll();
    this.extensions.dispose();
    this.clearVisuals();
    this.assets.clear();
    this.world.clear();
    this.bridge.dispose();
  }

  private syncAndRender(): void {
    if (this.dirtyRender) {
      syncMeshes(this.world, this.bridge, this.assets);
      syncLights(this.world, this.bridge);
      syncCameras(this.world, this.bridge);
      this.dirtyRender = false;
    }
    syncTransforms(this.world, this.bridge);
    syncLights(this.world, this.bridge);
    if (this.scriptSystem.enabled) this.audioSystem.sync(this.world, this.bridge);
    this.ui.sync(this.world);
    this.bridge.render();
  }

  private clearVisuals(): void {
    for (const entity of this.world.all()) {
      this.bridge.removeObject(entity.id);
    }
  }

  private handleWorldEvent(event: WorldEvent): void {
    if (event.type === "world.cleared") {
      this.clearVisuals();
      this.dirtyRender = true;
      return;
    }
    if (event.type === "entity.destroyed") {
      this.bridge.removeObject(event.entity.id);
      this.dirtyRender = true;
      return;
    }
    if (event.type === "entity.created" || event.type === "entity.reparented") {
      this.dirtyRender = true;
      return;
    }
    if (event.type === "component.added" || event.type === "component.updated") {
      if (isRenderComponent(event.component)) this.dirtyRender = true;
      return;
    }
    if (event.type === "component.removed" && isRenderComponent(event.component)) {
      this.bridge.removeObject(event.entityId);
      this.dirtyRender = true;
    }
  }
}

function isRenderComponent(component: string): boolean {
  return (
    component === "render.mesh" || component === "render.camera" || component === "render.light"
  );
}
