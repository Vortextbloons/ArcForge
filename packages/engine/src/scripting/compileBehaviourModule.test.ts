import { describe, expect, it } from "vitest";
import { Behaviour } from "./Behaviour.js";
import { compileBehaviourModule } from "./compileBehaviourModule.js";

describe("compileBehaviourModule", () => {
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
