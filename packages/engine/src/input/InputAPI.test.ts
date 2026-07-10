import { describe, expect, it } from "vitest";
import { InputAPI } from "./InputAPI.js";

describe("InputAPI", () => {
  it("supports configurable keyboard actions", () => {
    const target = new EventTarget();
    const input = new InputAPI();
    input.attach(target);
    input.configure({
      fly: {
        kind: "vector2",
        up: ["i"],
        down: ["k"],
        left: ["j"],
        right: ["l"],
      },
      fire: { kind: "button", keys: ["f"] },
    });

    target.dispatchEvent(keyEvent("keydown", "KeyI"));
    target.dispatchEvent(keyEvent("keydown", "KeyL"));
    target.dispatchEvent(keyEvent("keydown", "KeyF"));

    expect(input.getVector("fly").x).toBeCloseTo(Math.SQRT1_2);
    expect(input.getVector("fly").y).toBeCloseTo(Math.SQRT1_2);
    expect(input.getButton("fire")).toBe(true);
    expect(input.getButtonPressed("fire")).toBe(true);

    input.endFrame();
    expect(input.getButtonPressed("fire")).toBe(false);
    target.dispatchEvent(keyEvent("keyup", "KeyF"));
    expect(input.getButton("fire")).toBe(false);
    input.detach();
  });
});

function keyEvent(type: string, code: string): Event {
  return Object.assign(new Event(type), { code });
}
