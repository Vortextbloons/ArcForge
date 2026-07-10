import { describe, expect, it } from "vitest";
import { ComponentRegistry } from "./ComponentRegistry.js";
import { World, type WorldEvent } from "./World.js";
import { EntityAPI } from "../scripting/EntityAPI.js";

describe("World mutations", () => {
  it("emits lifecycle events for runtime systems", () => {
    const world = new World();
    const events: WorldEvent[] = [];
    world.subscribe((event) => events.push(event));

    world.create("player", "Player");
    world.addComponent("player", "game.health", { current: 100 });
    world.setComponent("player", "game.health", { current: 80 });
    world.removeComponent("player", "game.health");
    world.destroy("player");

    expect(events.map((event) => event.type)).toEqual([
      "entity.created",
      "component.added",
      "component.updated",
      "component.removed",
      "entity.destroyed",
    ]);
  });

  it("validates and controls entities through the public API", () => {
    const world = new World();
    const entities = new EntityAPI(world, ComponentRegistry.withCore());
    const player = entities.spawn({
      name: "Player",
      components: { "core.transform": {} },
    });
    const child = entities.spawn({ name: "Weapon", parent: player.id });

    expect(entities.findByName("Player")?.id).toBe(player.id);
    expect(entities.query("core.transform").map((entity) => entity.id)).toEqual([player.id]);
    expect([...player.transform.position]).toEqual([0, 0, 0]);

    entities.setParent(child.id, null);
    expect(child.parent).toBeNull();
    expect(() => entities.setParent(player.id, player.id)).toThrow(/parent itself/);
    expect(entities.destroy(player)).toBe(true);
  });
});
