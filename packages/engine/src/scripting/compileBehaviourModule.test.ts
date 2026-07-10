import { describe, expect, it } from "vitest";
import { Behaviour } from "./Behaviour.js";
import {
  compileBehaviourModule,
  compileBehaviourModules,
  transpileBehaviourSource,
} from "./compileBehaviourModule.js";

describe("compileBehaviourModule", () => {
  it("compiles relative project modules with real TypeScript transpilation", () => {
    const result = compileBehaviourModules([
      {
        path: "scripts/shared/speeds.ts",
        source: `export const playerSpeed: number = 7;`,
      },
      {
        path: "scripts/player.ts",
        source: `import { Behaviour } from "@arcforge/engine";
import { playerSpeed } from "./shared/speeds";
export default class Player extends Behaviour {
  speed: number = playerSpeed;
}`,
      },
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(new result.modules["scripts/player.ts"]!()).toMatchObject({ speed: 7 });
    expect(result.modules["scripts/shared/speeds.ts"]).toBeUndefined();
  });

  it("loads game-owned RuntimeSystem modules", () => {
    const result = compileBehaviourModules([
      {
        path: "plugins/weather/systems/weather.system.ts",
        source: `import type { RuntimeSystem } from "@arcforge/engine";
const weather: RuntimeSystem = { id: "game.weather", update() {} };
export default weather;`,
      },
    ]);
    expect(result.diagnostics).toEqual([]);
    expect(result.systems.map((system) => system.id)).toEqual(["game.weather"]);
  });

  it("compiles a default-export Behaviour class", () => {
    const result = compileBehaviourModule(
      `import { Behaviour, type GameContext } from "@arcforge/engine";

export default class Demo extends Behaviour {
  speed = 4;
  private hidden = 1;

  update(ctx: GameContext) {
    void ctx;
    this.hidden += this.speed;
  }
}
`,
      "scripts/demo.ts"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const instance = new result.ctor();
    expect(instance).toBeInstanceOf(Behaviour);
    expect((instance as { speed: number }).speed).toBe(4);
  });

  it("rejects scripts without default class", () => {
    const result = compileBehaviourModule(`export class Nope {}`, "scripts/bad.ts");
    expect(result.ok).toBe(false);
  });

  it("preserves object-literal keys like module/entityId", () => {
    const source = `import { Behaviour, type GameContext } from "@arcforge/engine";

export default class Demo extends Behaviour {
  onStart(ctx: GameContext) {
    ctx.debug.info("hi", {
      entityId: ctx.entity.id,
      module: "scripts/demo.ts",
    });
  }

  update(ctx: GameContext) {
    void ctx;
  }
}
`;
    const transpiled = transpileBehaviourSource(source);
    expect(transpiled).toContain('module: "scripts/demo.ts"');
    expect(transpiled).toContain("entityId: ctx.entity.id");
    expect(transpiled).not.toMatch(/\{\s*entityId\s*,/);
    expect(transpiled).not.toMatch(/,\s*module\s*[,}]/);

    const result = compileBehaviourModule(source, "scripts/demo.ts");
    expect(result.ok).toBe(true);
  });

  it("strips as-object casts and number[] fields without breaking !==", () => {
    const source = `import { Behaviour, type GameContext } from "@arcforge/engine";

export default class Cam extends Behaviour {
  lapTimes: number[] = [];

  update(ctx: GameContext) {
    if (typeof ctx !== "object") return;
    const data = ctx as { position?: number[] };
    void data;
    this.lapTimes = [];
  }
}
`;
    const transpiled = transpileBehaviourSource(source);
    expect(transpiled).toContain("!==");
    expect(transpiled).not.toContain("lapTimes:");
    expect(transpiled).not.toContain(" as ");
    const result = compileBehaviourModule(source, "scripts/cam.ts");
    expect(result.ok).toBe(true);
  });

  it("compiles object-literal waypoints without stripping values", () => {
    const result = compileBehaviourModule(
      `import { Behaviour, type GameContext } from "@arcforge/engine";

export default class AI extends Behaviour {
  waypoints = [];

  onStart(_ctx: GameContext) {
    this.waypoints = [
      { x: 0, z: -20 },
      { x: 20, z: 0 },
    ];
  }

  update(ctx: GameContext) {
    void ctx;
  }
}
`,
      "scripts/ai.ts"
    );
    expect(result.ok).toBe(true);
  });
});
