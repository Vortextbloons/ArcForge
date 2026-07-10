import { describe, expect, it } from "vitest";
import {
  CreateEntityCommand,
  DeleteEntityCommand,
  EditorSession,
  RenameEntityCommand,
  UpdateComponentCommand,
} from "./index.js";

const SCENE = {
  version: 1 as const,
  name: "Test",
  entities: [
    {
      id: "player",
      name: "Player",
      parent: null,
      components: {
        "core.transform": {
          position: [0, 1, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      },
    },
  ],
};

describe("EditorSession commands", () => {
  it("creates, renames, updates, and undoes", async () => {
    const session = new EditorSession({ scene: SCENE });

    await session.execute(
      new CreateEntityCommand({
        id: "coin",
        name: "Coin",
        components: {
          "core.transform": {
            position: [2, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
        },
      })
    );
    expect(session.findEntity("coin")?.name).toBe("Coin");
    expect(session.getSelection()).toEqual(["coin"]);
    expect(session.isDirty()).toBe(true);

    await session.execute(new RenameEntityCommand("coin", "Gold Coin"));
    expect(session.findEntity("coin")?.name).toBe("Gold Coin");

    await session.execute(
      new UpdateComponentCommand("coin", "core.transform", {
        position: [5, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      })
    );
    expect(
      (
        session.findEntity("coin")?.components["core.transform"] as {
          position: number[];
        }
      ).position
    ).toEqual([5, 0, 0]);

    await session.undo();
    expect(
      (
        session.findEntity("coin")?.components["core.transform"] as {
          position: number[];
        }
      ).position
    ).toEqual([2, 0, 0]);

    await session.undo();
    expect(session.findEntity("coin")?.name).toBe("Coin");

    await session.undo();
    expect(session.findEntity("coin")).toBeUndefined();
    expect(session.isDirty()).toBe(true);
  });

  it("deletes descendants with an entity", async () => {
    const session = new EditorSession({
      scene: {
        version: 1,
        name: "Hierarchy",
        entities: [
          {
            id: "root",
            name: "Root",
            parent: null,
            components: {},
          },
          {
            id: "child",
            name: "Child",
            parent: "root",
            components: {},
          },
        ],
      },
    });

    await session.execute(new DeleteEntityCommand("root"));
    expect(session.getScene().entities).toHaveLength(0);

    await session.undo();
    expect(session.findEntity("root")).toBeDefined();
    expect(session.findEntity("child")).toBeDefined();
  });
});
