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

  it("clears pointer deltas on pointerleave", () => {
    const target = new EventTarget();
    const input = new InputAPI();
    input.attach(target);

    target.dispatchEvent(
      Object.assign(new Event("pointermove"), {
        clientX: 10,
        clientY: 20,
        movementX: 4,
        movementY: -3,
      })
    );
    expect(input.getPointer().deltaX).toBe(4);
    expect(input.getPointer().deltaY).toBe(-3);

    target.dispatchEvent(new Event("pointerleave"));
    expect(input.getPointer().deltaX).toBe(0);
    expect(input.getPointer().deltaY).toBe(0);
    input.detach();
  });
});

function keyEvent(type: string, code: string): Event {
  return Object.assign(new Event(type), { code });
}
