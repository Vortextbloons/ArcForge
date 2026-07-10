import { describe, expect, it, vi } from "vitest";
import { SceneAPI } from "../runtime/SceneAPI.js";
import { StorageAPI } from "./StorageAPI.js";
import { TimerAPI } from "./TimerAPI.js";

describe("gameplay services", () => {
  it("runs deterministic timeouts and intervals", () => {
    const timers = new TimerAPI();
    const once = vi.fn();
    const repeated = vi.fn();
    timers.setTimeout(once, 0.5);
    const interval = timers.setInterval(repeated, 0.25);

    timers.update(0.2);
    expect(once).not.toHaveBeenCalled();
    timers.update(0.3);
    expect(once).toHaveBeenCalledOnce();
    expect(repeated).toHaveBeenCalledTimes(2);
    timers.clear(interval);
    timers.update(1);
    expect(repeated).toHaveBeenCalledTimes(2);
  });

  it("stores JSON values without requiring browser persistence", () => {
    const storage = new StorageAPI("arcforge.test");
    storage.set("save", { level: 3 });
    expect(storage.get("save", { level: 0 })).toEqual({ level: 3 });
    expect(storage.keys()).toContain("save");
    storage.remove("save");
    expect(storage.has("save")).toBe(false);
  });

  it("registers and queues scene transitions", () => {
    const scenes = new SceneAPI();
    scenes.register("scenes/Menu.scene.json", { version: 1, name: "Menu", entities: [] });
    scenes.load("scenes/Menu.scene.json");
    const pending = scenes._consumePending();
    expect(pending?.path).toBe("scenes/Menu.scene.json");
    expect(pending?.scene.name).toBe("Menu");
    expect(scenes._consumePending()).toBeNull();
  });
});
