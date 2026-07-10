import { describe, expect, it } from "vitest";
import { World } from "../ecs/World.js";
import {
  NullPhysicsBackend,
  PhysicsAPI,
  createPhysicsBackend,
} from "./index.js";

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

    const before = world.getComponent<{ position: number[] }>(
      "ball",
      "core.transform"
    )!.position[1];

    for (let i = 0; i < 30; i++) {
      backend.step(world, 1 / 60);
    }

    const after = world.getComponent<{ position: number[] }>(
      "ball",
      "core.transform"
    )!.position[1];

    expect(after).toBeLessThan(before);
    backend.dispose();
  }, 20_000);
});
