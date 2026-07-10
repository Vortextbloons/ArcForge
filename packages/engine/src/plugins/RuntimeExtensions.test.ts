import { describe, expect, it, vi } from "vitest";
import { AssetManager } from "../assets/AssetManager.js";
import { AudioSystem } from "../audio/AudioSystem.js";
import { ComponentRegistry } from "../ecs/ComponentRegistry.js";
import { World } from "../ecs/World.js";
import { InputAPI } from "../input/InputAPI.js";
import { NullPhysicsBackend } from "../physics/NullPhysicsBackend.js";
import { PhysicsAPI } from "../physics/PhysicsAPI.js";
import type { RenderBridge } from "../render/RenderBridge.js";
import { EntityAPI } from "../scripting/EntityAPI.js";
import { EventBus } from "../scripting/EventBus.js";
import { RuntimeExtensions } from "./RuntimeExtensions.js";

describe("RuntimeExtensions", () => {
  it("runs and disposes game-owned systems", () => {
    const world = new World();
    const assets = new AssetManager();
    const audio = new AudioSystem(assets);
    const physics = new PhysicsAPI(new NullPhysicsBackend());
    const extensions = new RuntimeExtensions({
      world,
      entities: new EntityAPI(world, ComponentRegistry.withCore()),
      input: new InputAPI(),
      events: new EventBus(),
      assets,
      audio: audio.api,
      physics,
      render: {} as RenderBridge,
    });
    const update = vi.fn();
    const dispose = vi.fn();
    extensions.registerSystem({ id: "game.weather", update, dispose });

    extensions.update({ delta: 0.1, elapsed: 1, fixedDelta: 1 / 60 });
    expect(update).toHaveBeenCalledOnce();
    expect(extensions.listSystems()).toEqual(["game.weather"]);
    expect(extensions.unregisterSystem("game.weather")).toBe(true);
    expect(dispose).toHaveBeenCalledOnce();
  });
});
