import type * as THREE from "three";
import type { AssetManager } from "../assets/AssetManager.js";
import type { AudioAPI } from "../audio/AudioSystem.js";
import type { World } from "../ecs/World.js";
import type { InputAPI } from "../input/InputAPI.js";
import type { PhysicsAPI } from "../physics/PhysicsAPI.js";
import type { RenderBridge } from "../render/RenderBridge.js";
import type { EntityAPI } from "../scripting/EntityAPI.js";
import type { EventBus } from "../scripting/EventBus.js";
import type { TimeState } from "../runtime/GameLoop.js";

export interface RuntimeExtensionContext {
  world: World;
  entities: EntityAPI;
  input: InputAPI;
  events: EventBus;
  assets: AssetManager;
  audio: AudioAPI;
  physics: PhysicsAPI;
  render: RenderBridge;
}

export interface RuntimeSystem {
  id: string;
  onRegister?(ctx: RuntimeExtensionContext): void;
  onSceneLoaded?(ctx: RuntimeExtensionContext): void;
  update?(ctx: RuntimeExtensionContext, time: TimeState): void;
  fixedUpdate?(ctx: RuntimeExtensionContext, time: TimeState): void;
  render?(ctx: RuntimeExtensionContext, time: TimeState): void;
  dispose?(ctx: RuntimeExtensionContext): void;
}

export interface RuntimeRenderAdapter<T = unknown> {
  component: string;
  create(ctx: RuntimeExtensionContext, entityId: string, data: T): THREE.Object3D;
  update?(ctx: RuntimeExtensionContext, object: THREE.Object3D, entityId: string, data: T): void;
  dispose?(ctx: RuntimeExtensionContext, object: THREE.Object3D, entityId: string): void;
}

interface AdapterEntry {
  adapter: RuntimeRenderAdapter;
  object: THREE.Object3D;
}

/** Public registry for game-owned systems and component render adapters. */
export class RuntimeExtensions {
  private readonly systems = new Map<string, RuntimeSystem>();
  private readonly adapters = new Map<string, RuntimeRenderAdapter>();
  private readonly adapterEntries = new Map<string, AdapterEntry>();

  constructor(private readonly ctx: RuntimeExtensionContext) {}

  registerSystem(system: RuntimeSystem): () => void {
    if (this.systems.has(system.id))
      throw new Error(`Runtime system already registered: ${system.id}`);
    this.systems.set(system.id, system);
    system.onRegister?.(this.ctx);
    return () => this.unregisterSystem(system.id);
  }

  unregisterSystem(id: string): boolean {
    const system = this.systems.get(id);
    if (!system) return false;
    system.dispose?.(this.ctx);
    this.systems.delete(id);
    return true;
  }

  registerRenderAdapter<T>(adapter: RuntimeRenderAdapter<T>): () => void {
    if (this.adapters.has(adapter.component)) {
      throw new Error(`Render adapter already registered: ${adapter.component}`);
    }
    this.adapters.set(adapter.component, adapter as RuntimeRenderAdapter);
    return () => this.unregisterRenderAdapter(adapter.component);
  }

  unregisterRenderAdapter(component: string): boolean {
    const adapter = this.adapters.get(component);
    if (!adapter) return false;
    this.adapters.delete(component);
    for (const [key, entry] of this.adapterEntries) {
      if (entry.adapter === adapter) this.removeAdapterEntry(key, entry);
    }
    return true;
  }

  update(time: TimeState): void {
    for (const system of this.systems.values()) system.update?.(this.ctx, time);
  }

  fixedUpdate(time: TimeState): void {
    for (const system of this.systems.values()) system.fixedUpdate?.(this.ctx, time);
  }

  render(time: TimeState): void {
    this.syncRenderAdapters();
    for (const system of this.systems.values()) system.render?.(this.ctx, time);
  }

  onSceneLoaded(): void {
    this.clearAdapterEntries();
    for (const system of this.systems.values()) system.onSceneLoaded?.(this.ctx);
  }

  listSystems(): string[] {
    return [...this.systems.keys()];
  }

  clearSystems(): void {
    for (const id of this.systems.keys()) this.unregisterSystem(id);
  }

  listRenderAdapters(): string[] {
    return [...this.adapters.keys()];
  }

  dispose(): void {
    this.clearAdapterEntries();
    this.clearSystems();
    this.adapters.clear();
  }

  private syncRenderAdapters(): void {
    const alive = new Set<string>();
    for (const [component, adapter] of this.adapters) {
      for (const entity of this.ctx.world.query(component)) {
        const key = `${entity.id}::${component}`;
        alive.add(key);
        const data = this.ctx.world.getComponent(entity.id, component);
        let entry = this.adapterEntries.get(key);
        if (!entry) {
          const object = adapter.create(this.ctx, entity.id, data);
          this.ctx.render.ensureObject(entity.id, entity.name).add(object);
          entry = { adapter, object };
          this.adapterEntries.set(key, entry);
        }
        adapter.update?.(this.ctx, entry.object, entity.id, data);
      }
    }
    for (const [key, entry] of this.adapterEntries) {
      if (!alive.has(key)) this.removeAdapterEntry(key, entry);
    }
  }

  private clearAdapterEntries(): void {
    for (const [key, entry] of this.adapterEntries) this.removeAdapterEntry(key, entry);
  }

  private removeAdapterEntry(key: string, entry: AdapterEntry): void {
    const entityId = key.slice(0, key.indexOf("::"));
    entry.adapter.dispose?.(this.ctx, entry.object, entityId);
    entry.object.removeFromParent();
    this.adapterEntries.delete(key);
  }
}
