import { describe, expect, it } from "vitest";
import { loadScene, World } from "./index.js";

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
});
