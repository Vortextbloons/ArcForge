import { describe, expect, it } from "vitest";
import { loadScene, PrefabRegistry, World } from "./index.js";

const SCENE = {
  version: 1,
  name: "Test",
  entities: [
    {
      id: "a",
      name: "Box",
      parent: null,
      components: {
        "core.transform": {
          position: [1, 2, 3],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        "render.mesh": {
          primitive: "box",
          color: "#ff0000",
        },
      },
    },
  ],
};

describe("loadScene", () => {
  it("parses entities and core components with defaults", () => {
    const { world, scene } = loadScene(SCENE);
    expect(scene.name).toBe("Test");
    expect(world.has("a")).toBe(true);

    const transform = world.getComponent<{
      position: [number, number, number];
    }>("a", "core.transform");
    expect(transform?.position).toEqual([1, 2, 3]);

    const mesh = world.getComponent<{ primitive: string }>("a", "render.mesh");
    expect(mesh?.primitive).toBe("box");
  });

  it("rejects missing parents", () => {
    expect(() =>
      loadScene({
        version: 1,
        name: "Bad",
        entities: [
          {
            id: "child",
            name: "Child",
            parent: "missing",
            components: {},
          },
        ],
      })
    ).toThrow(/missing parent/);
  });

  it("can load into an existing world", () => {
    const world = new World();
    world.create("old", "Old");
    loadScene(SCENE, { world });
    expect(world.has("old")).toBe(false);
    expect(world.has("a")).toBe(true);
  });

  it("resolves prefab hierarchies and sparse overrides", () => {
    const prefabs = new PrefabRegistry();
    prefabs.register("prefabs/coin.prefab.json", {
      version: 1,
      name: "Coin",
      root: {
        id: "coin_root",
        name: "Coin",
        components: {
          "core.transform": {
            position: [0, 1, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          "render.mesh": { primitive: "sphere", color: "#ffff00" },
        },
        children: [
          {
            id: "glow",
            name: "Glow",
            components: { "render.light": { type: "point", color: "#ffff00" } },
            children: [],
          },
        ],
      },
    });

    const { world } = loadScene(
      {
        version: 1,
        name: "Prefab test",
        entities: [
          {
            id: "coin_1",
            name: "Special Coin",
            parent: null,
            prefab: "prefabs/coin.prefab.json",
            components: {},
            overrides: { "core.transform.position": [3, 2, 1] },
          },
        ],
      },
      { prefabs }
    );

    expect(world.get("coin_1")?.name).toBe("Special Coin");
    expect(world.get("coin_1/glow")?.parent).toBe("coin_1");
    expect(
      world.getComponent<{ position: number[] }>("coin_1", "core.transform")?.position
    ).toEqual([3, 2, 1]);
  });

  it("resolves nested prefabs with local overrides", () => {
    const prefabs = new PrefabRegistry();
    prefabs.register("prefabs/light.prefab.json", {
      version: 1,
      name: "Light",
      root: {
        id: "light",
        name: "Light",
        components: { "render.light": { type: "point", color: "#ffffff" } },
        children: [],
      },
    });
    prefabs.register("prefabs/lamp.prefab.json", {
      version: 1,
      name: "Lamp",
      root: {
        id: "lamp",
        name: "Lamp",
        components: { "core.transform": {} },
        children: [
          {
            id: "bulb",
            name: "Bulb",
            prefab: "prefabs/light.prefab.json",
            overrides: { "render.light.color": "#ff8800" },
            components: {},
            children: [],
          },
        ],
      },
    });

    const instance = prefabs.instantiate("prefabs/lamp.prefab.json", { id: "lamp_1" });
    expect(instance.find((entity) => entity.id === "lamp_1/bulb")?.components).toMatchObject({
      "render.light": { color: "#ff8800" },
    });
  });
});
