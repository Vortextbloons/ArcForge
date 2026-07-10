import type { Scene, ScriptBehaviour } from "@threeforge/schemas";
import type { World } from "../ecs/World.js";
import type { TimeState } from "../runtime/GameLoop.js";
import type { InputAPI } from "../input/InputAPI.js";
import { Behaviour, type GameContext } from "./Behaviour.js";
import { EntityHandle } from "./EntityHandle.js";
import type { EventBus } from "./EventBus.js";
import type { RuntimeLogger } from "./RuntimeLogger.js";
import type { ScriptRegistry } from "./ScriptRegistry.js";

const SCRIPT_ID = "script.behaviour";

interface ScriptInstance {
  entityId: string;
  module: string;
  behaviour: Behaviour;
  started: boolean;
  enabled: boolean;
}

/**
 * Instantiates and ticks Behaviour scripts attached via script.behaviour.
 */
export class ScriptSystem {
  private readonly instances = new Map<string, ScriptInstance>();
  private scriptsEnabled = false;

  constructor(
    private readonly world: World,
    private readonly registry: ScriptRegistry,
    private readonly input: InputAPI,
    private readonly events: EventBus,
    private readonly logger: RuntimeLogger,
    private getScene: () => Scene
  ) {}

  setEnabled(enabled: boolean): void {
    if (this.scriptsEnabled === enabled) return;
    if (!enabled) {
      this.destroyAll();
    }
    this.scriptsEnabled = enabled;
    if (enabled) {
      this.syncInstances();
    }
  }

  get enabled(): boolean {
    return this.scriptsEnabled;
  }

  /** Rebuild instances from current world components. */
  syncInstances(): void {
    if (!this.scriptsEnabled) return;

    const alive = new Set<string>();

    for (const entity of this.world.query(SCRIPT_ID)) {
      const data = this.world.getComponent<ScriptBehaviour>(
        entity.id,
        SCRIPT_ID
      );
      if (!data || data.enabled === false) continue;

      const key = instanceKey(entity.id, data.module);
      alive.add(key);

      let instance = this.instances.get(key);
      if (!instance) {
        const ctor = this.registry.get(data.module);
        if (!ctor) {
          this.logger.error(`Script module not registered: ${data.module}`, {
            module: data.module,
            entityId: entity.id,
          });
          continue;
        }
        try {
          const behaviour = new ctor();
          applyProps(behaviour, data.props ?? {});
          instance = {
            entityId: entity.id,
            module: data.module,
            behaviour,
            started: false,
            enabled: true,
          };
          this.instances.set(key, instance);
        } catch (error) {
          this.logError("Failed to construct behaviour", error, {
            module: data.module,
            entityId: entity.id,
          });
        }
      }
    }

    for (const [key, instance] of this.instances) {
      if (!alive.has(key)) {
        this.destroyInstance(key, instance);
      }
    }
  }

  update(time: TimeState): void {
    if (!this.scriptsEnabled) return;
    this.syncInstances();

    for (const instance of this.instances.values()) {
      const ctx = this.createContext(instance.entityId, time);
      if (!ctx) continue;

      try {
        if (!instance.started) {
          instance.behaviour.onStart(ctx);
          instance.started = true;
        }
        instance.behaviour.update(ctx);
      } catch (error) {
        this.logError("Script update failed", error, {
          module: instance.module,
          entityId: instance.entityId,
        });
      }
    }
  }

  fixedUpdate(time: TimeState): void {
    if (!this.scriptsEnabled) return;

    for (const instance of this.instances.values()) {
      if (!instance.started) continue;
      const ctx = this.createContext(instance.entityId, time);
      if (!ctx) continue;
      try {
        instance.behaviour.fixedUpdate(ctx);
      } catch (error) {
        this.logError("Script fixedUpdate failed", error, {
          module: instance.module,
          entityId: instance.entityId,
        });
      }
    }
  }

  destroyAll(): void {
    for (const [key, instance] of [...this.instances.entries()]) {
      this.destroyInstance(key, instance);
    }
  }

  private destroyInstance(key: string, instance: ScriptInstance): void {
    const time: TimeState = { delta: 0, elapsed: 0, fixedDelta: 1 / 60 };
    const ctx = this.createContext(instance.entityId, time);
    if (ctx && instance.started) {
      try {
        instance.behaviour.onDestroy(ctx);
      } catch (error) {
        this.logError("Script onDestroy failed", error, {
          module: instance.module,
          entityId: instance.entityId,
        });
      }
    }
    this.instances.delete(key);
  }

  private createContext(
    entityId: string,
    time: TimeState
  ): GameContext | null {
    if (!this.world.has(entityId)) return null;
    return {
      time,
      entity: new EntityHandle(entityId, this.world),
      world: this.world,
      scene: this.getScene(),
      input: this.input,
      events: this.events,
      debug: this.logger,
    };
  }

  private logError(
    prefix: string,
    error: unknown,
    meta: { module: string; entityId: string }
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    this.logger.error(`${prefix}: ${err.message}`, {
      module: meta.module,
      entityId: meta.entityId,
      stack: err.stack,
    });
  }
}

function instanceKey(entityId: string, module: string): string {
  return `${entityId}::${module}`;
}

function applyProps(behaviour: Behaviour, props: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(props)) {
    (behaviour as unknown as Record<string, unknown>)[key] = value;
  }
}
