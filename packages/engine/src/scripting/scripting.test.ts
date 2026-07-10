import { describe, expect, it } from "vitest";
import {
  Behaviour,
  type GameContext,
  ScriptRegistry,
  ScriptSystem,
  InputAPI,
  EventBus,
  RuntimeLogger,
  loadScene,
  World,
  PhysicsAPI,
  NullPhysicsBackend,
  EntityAPI,
  ComponentRegistry,
  AssetManager,
  AudioSystem,
  AnimationSystem,
  TimerAPI,
  StorageAPI,
  SceneAPI,
  RuntimeExtensions,
  type RenderBridge,
  ParticleSystem,
} from "../index.js";
import { typecheckScripts } from "../compiler.js";

class MoveRight extends Behaviour {
  speed = 1;
  update(ctx: GameContext): void {
    ctx.entity.transform.translate(this.speed * ctx.time.delta, 0, 0);
  }
}

describe("scripting", () => {
  it("typechecks valid script sources", () => {
    const result = typecheckScripts([
      {
        path: "scripts/ok.ts",
        source: `import { Behaviour } from "@arcforge/engine";
export default class Ok extends Behaviour {
  update() {}
}
`,
      },
    ]);
    expect(result.ok).toBe(true);
  });

  it("rejects forbidden imports", () => {
    const result = typecheckScripts([
      {
        path: "scripts/bad.ts",
        source: `import { Behaviour } from "@arcforge/engine";
import { invoke } from "@tauri-apps/api/core";
export default class Bad extends Behaviour {}
`,
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => /Tauri/.test(d.message))).toBe(true);
  });

  it("reports semantic TypeScript errors", () => {
    const result = typecheckScripts([
      {
        path: "scripts/types.ts",
        source: `const speed: number = "fast"; export { speed };`,
      },
    ]);
    expect(result.ok).toBe(false);
    expect(
      result.diagnostics.some((diagnostic) =>
        /not assignable to type 'number'/.test(diagnostic.message)
      )
    ).toBe(true);
  });

  it("runs behaviour update and moves transform", () => {
    const world = new World();
    const registry = new ScriptRegistry();
    registry.register("scripts/move.ts", MoveRight);
    const input = new InputAPI();
    const events = new EventBus();
    const logger = new RuntimeLogger();
    const physics = new PhysicsAPI(new NullPhysicsBackend());
    const entities = new EntityAPI(world, ComponentRegistry.withCore());
    const assets = new AssetManager();
    const audio = new AudioSystem(assets);
    const extensions = new RuntimeExtensions({
      world,
      entities,
      input,
      events,
      assets,
      audio: audio.api,
      physics,
      render: {} as RenderBridge,
    });

    const loaded = loadScene(
      {
        version: 1,
        name: "ScriptTest",
        entities: [
          {
            id: "box",
            name: "Box",
            parent: null,
            components: {
              "core.transform": {
                position: [0, 0, 0],
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
              },
              "script.behaviour": {
                module: "scripts/move.ts",
                props: { speed: 2 },
                enabled: true,
              },
            },
          },
        ],
      },
      { world }
    );

    const scripts = new ScriptSystem(
      world,
      registry,
      input,
      events,
      logger,
      () => loaded.scene,
      physics,
      entities,
      assets,
      audio.api,
      new AnimationSystem(),
      new TimerAPI(),
      new StorageAPI("test"),
      new SceneAPI(),
      extensions,
      new ParticleSystem()
    );
    scripts.setEnabled(true);
    scripts.update({ delta: 0.5, elapsed: 0.5, fixedDelta: 1 / 60 });

    const pos = world.getComponent<{ position: number[] }>("box", "core.transform")?.position;
    expect(pos?.[0]).toBeCloseTo(1, 5);
  });

  it("parses script.behaviour components when loading scenes", () => {
    const { world } = loadScene({
      version: 1,
      name: "S",
      entities: [
        {
          id: "a",
          name: "A",
          parent: null,
          components: {
            "script.behaviour": {
              module: "scripts/player.controller.ts",
            },
          },
        },
      ],
    });
    const data = world.getComponent<{ module: string; enabled: boolean }>("a", "script.behaviour");
    expect(data?.module).toBe("scripts/player.controller.ts");
    expect(data?.enabled).toBe(true);
  });
});
