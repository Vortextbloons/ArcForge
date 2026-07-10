import { describe, expect, it } from "vitest";
import { World } from "../ecs/World.js";
import { NullPhysicsBackend, PhysicsAPI, createPhysicsBackend } from "./index.js";

describe("physics", () => {
  it("defaults to null backend", () => {
    const api = new PhysicsAPI(new NullPhysicsBackend());
    expect(api.kind).toBe("none");
    api.applyImpulse("x", [0, 1, 0]);
    api.setLinearVelocity("x", [0, 0, 0]);
  });

  it("steps a dynamic body with rapier backend", async () => {
    const backend = await createPhysicsBackend("rapier");
    expect(backend.kind).toBe("rapier");

    const world = new World();
    world.create("ball", "Ball");
    world.addComponent("ball", "core.transform", {
      position: [0, 5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
    world.addComponent("ball", "physics.rigidbody", {
      type: "dynamic",
      mass: 1,
      linearDamping: 0,
      angularDamping: 0,
      gravityScale: 1,
      velocity: [0, 0, 0],
      lockRotation: false,
    });
    world.addComponent("ball", "physics.collider", {
      shape: "sphere",
      size: [0.5, 0.5, 0.5],
      isTrigger: false,
      friction: 0.5,
      restitution: 0,
      offset: [0, 0, 0],
    });

    const before = world.getComponent<{ position: number[] }>("ball", "core.transform")!
      .position[1];

    for (let i = 0; i < 30; i++) {
      backend.step(world, 1 / 60);
    }

    const after = world.getComponent<{ position: number[] }>("ball", "core.transform")!.position[1];

    expect(after).toBeLessThan(before);
    backend.dispose();
  }, 20_000);

  it("supports raycasts and collision events through the public API", async () => {
    const api = new PhysicsAPI(await createPhysicsBackend("rapier"));
    const world = new World();
    addBody(world, "ground", [0, -0.5, 0], "static", "box", [5, 0.5, 5]);
    addBody(world, "ball", [0, 2, 0], "dynamic", "sphere", [0.5, 0.5, 0.5]);
    const collisions: string[] = [];
    api.onCollision((event) => {
      if (event.started) collisions.push(`${event.entityA}:${event.entityB}`);
    });

    api._step(world, 1 / 60);
    const hit = api.raycast([2, 5, 0], [0, -1, 0], 20);
    expect(hit?.entityId).toBe("ground");
    expect(hit?.point[1]).toBeCloseTo(0, 3);

    for (let i = 0; i < 120; i++) api._step(world, 1 / 60);
    expect(collisions.some((pair) => pair.includes("ground") && pair.includes("ball"))).toBe(true);
    api._dispose();
  }, 20_000);
});

function addBody(
  world: World,
  id: string,
  position: [number, number, number],
  type: "dynamic" | "static",
  shape: "box" | "sphere",
  size: [number, number, number]
): void {
  world.create(id, id);
  world.addComponent(id, "core.transform", {
    position,
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });
  world.addComponent(id, "physics.rigidbody", {
    type,
    mass: type === "dynamic" ? 1 : 0,
    linearDamping: 0,
    angularDamping: 0,
    gravityScale: 1,
    velocity: [0, 0, 0],
    lockRotation: false,
  });
  world.addComponent(id, "physics.collider", {
    shape,
    size,
    isTrigger: false,
    friction: 0.5,
    restitution: 0,
    offset: [0, 0, 0],
  });
}
