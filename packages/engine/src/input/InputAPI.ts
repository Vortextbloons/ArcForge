export type Vec2 = { x: number; y: number };

export interface PointerState extends Vec2 {
  deltaX: number;
  deltaY: number;
  wheel: number;
  locked: boolean;
}

export type InputActionBinding =
  | {
      kind: "button";
      keys?: string[];
      mouseButtons?: number[];
      gamepadButtons?: number[];
    }
  | {
      kind: "axis";
      positive?: string[];
      negative?: string[];
      gamepadAxis?: number;
      deadzone?: number;
    }
  | {
      kind: "vector2";
      up?: string[];
      down?: string[];
      left?: string[];
      right?: string[];
      gamepadAxes?: [number, number];
      deadzone?: number;
    };

export type InputActionMap = Record<string, InputActionBinding>;

const DEFAULT_ACTIONS: InputActionMap = {
  move: {
    kind: "vector2",
    up: ["KeyW", "ArrowUp"],
    down: ["KeyS", "ArrowDown"],
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    gamepadAxes: [0, 1],
  },
  horizontal: {
    kind: "axis",
    positive: ["KeyD", "ArrowRight"],
    negative: ["KeyA", "ArrowLeft"],
    gamepadAxis: 0,
  },
  vertical: {
    kind: "axis",
    positive: ["KeyW", "ArrowUp"],
    negative: ["KeyS", "ArrowDown"],
    gamepadAxis: 1,
  },
  jump: { kind: "button", keys: ["Space"], gamepadButtons: [0] },
};

/** Configurable keyboard, pointer, touch, and gamepad input for scripts. */
export class InputAPI {
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly released = new Set<string>();
  private readonly mouseButtons = new Set<number>();
  private readonly mousePressed = new Set<number>();
  private readonly mouseReleased = new Set<number>();
  private actions: InputActionMap = structuredClone(DEFAULT_ACTIONS);
  private pointer: PointerState = {
    x: 0,
    y: 0,
    deltaX: 0,
    deltaY: 0,
    wheel: 0,
    locked: false,
  };
  private target: EventTarget | null = null;

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.keys.has(event.code)) this.pressed.add(event.code);
    this.keys.add(event.code);
  };
  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
    this.released.add(event.code);
  };
  private readonly onPointerDown = (event: PointerEvent) => {
    if (!this.mouseButtons.has(event.button)) this.mousePressed.add(event.button);
    this.mouseButtons.add(event.button);
  };
  private readonly onPointerUp = (event: PointerEvent) => {
    this.mouseButtons.delete(event.button);
    this.mouseReleased.add(event.button);
  };
  private readonly onPointerMove = (event: PointerEvent) => {
    this.pointer.x = event.clientX;
    this.pointer.y = event.clientY;
    this.pointer.deltaX += event.movementX;
    this.pointer.deltaY += event.movementY;
  };
  private readonly onWheel = (event: WheelEvent) => {
    this.pointer.wheel += event.deltaY;
  };
  private readonly onPointerLeave = () => {
    // Drop queued look/zoom deltas when the cursor leaves the input target
    // (e.g. editor panels outside the viewport).
    this.pointer.deltaX = 0;
    this.pointer.deltaY = 0;
    this.pointer.wheel = 0;
  };
  private readonly onPointerLockChange = () => {
    this.pointer.locked = typeof document !== "undefined" && document.pointerLockElement !== null;
  };

  /**
   * Attach input listeners.
   * Pass a viewport/canvas element in the editor so pointer move is scoped to the game view.
   * Keyboard still works when that element is focused.
   */
  attach(target: EventTarget = window): void {
    if (this.target) return;
    this.target = target;
    target.addEventListener("keydown", this.onKeyDown as EventListener);
    target.addEventListener("keyup", this.onKeyUp as EventListener);
    target.addEventListener("pointerdown", this.onPointerDown as EventListener);
    target.addEventListener("pointerup", this.onPointerUp as EventListener);
    target.addEventListener("pointermove", this.onPointerMove as EventListener);
    target.addEventListener("wheel", this.onWheel as EventListener, { passive: true });
    target.addEventListener("pointerleave", this.onPointerLeave as EventListener);
    // Release buttons even if the pointer is released outside the target.
    if (typeof window !== "undefined" && target !== window) {
      window.addEventListener("pointerup", this.onPointerUp as EventListener);
      window.addEventListener("blur", this.onPointerLeave);
    }
    if (typeof document !== "undefined") {
      document.addEventListener("pointerlockchange", this.onPointerLockChange);
    }
  }

  detach(): void {
    const target = this.target;
    if (!target) return;
    target.removeEventListener("keydown", this.onKeyDown as EventListener);
    target.removeEventListener("keyup", this.onKeyUp as EventListener);
    target.removeEventListener("pointerdown", this.onPointerDown as EventListener);
    target.removeEventListener("pointerup", this.onPointerUp as EventListener);
    target.removeEventListener("pointermove", this.onPointerMove as EventListener);
    target.removeEventListener("wheel", this.onWheel as EventListener);
    target.removeEventListener("pointerleave", this.onPointerLeave as EventListener);
    if (typeof window !== "undefined" && target !== window) {
      window.removeEventListener("pointerup", this.onPointerUp as EventListener);
      window.removeEventListener("blur", this.onPointerLeave);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    }
    this.target = null;
    this.keys.clear();
    this.pressed.clear();
    this.released.clear();
    this.mouseButtons.clear();
    this.mousePressed.clear();
    this.mouseReleased.clear();
    this.pointer.deltaX = 0;
    this.pointer.deltaY = 0;
    this.pointer.wheel = 0;
  }

  configure(actions: InputActionMap): void {
    this.actions = structuredClone(actions);
  }

  defineAction(name: string, binding: InputActionBinding): void {
    this.actions[name] = structuredClone(binding);
  }

  getActionMap(): InputActionMap {
    return structuredClone(this.actions);
  }

  endFrame(): void {
    this.pressed.clear();
    this.released.clear();
    this.mousePressed.clear();
    this.mouseReleased.clear();
    this.pointer.deltaX = 0;
    this.pointer.deltaY = 0;
    this.pointer.wheel = 0;
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  isKeyPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  isKeyReleased(code: string): boolean {
    return this.released.has(code);
  }

  getVector(action: string): Vec2 {
    const binding = this.actions[action];
    if (!binding || binding.kind !== "vector2") return { x: 0, y: 0 };
    let x = this.digital(binding.right) - this.digital(binding.left);
    let y = this.digital(binding.up) - this.digital(binding.down);
    const gamepad = currentGamepad();
    if (gamepad && binding.gamepadAxes) {
      x = strongest(x, applyDeadzone(gamepad.axes[binding.gamepadAxes[0]] ?? 0, binding.deadzone));
      y = strongest(y, -applyDeadzone(gamepad.axes[binding.gamepadAxes[1]] ?? 0, binding.deadzone));
    }
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  getAxis(action: string): number {
    const binding = this.actions[action];
    if (!binding || binding.kind !== "axis") return 0;
    let value = this.digital(binding.positive) - this.digital(binding.negative);
    const gamepad = currentGamepad();
    if (gamepad && binding.gamepadAxis !== undefined) {
      const raw = gamepad.axes[binding.gamepadAxis] ?? 0;
      const axis = binding.gamepadAxis === 1 ? -raw : raw;
      value = strongest(value, applyDeadzone(axis, binding.deadzone));
    }
    return value;
  }

  getButton(action: string): boolean {
    const binding = this.actions[action];
    if (!binding || binding.kind !== "button") return false;
    if (binding.keys?.some((key) => this.keys.has(resolveKeyCode(key) ?? key))) return true;
    if (binding.mouseButtons?.some((button) => this.mouseButtons.has(button))) return true;
    const gamepad = currentGamepad();
    return binding.gamepadButtons?.some((button) => gamepad?.buttons[button]?.pressed) ?? false;
  }

  getButtonPressed(action: string): boolean {
    const binding = this.actions[action];
    if (!binding || binding.kind !== "button") return false;
    return (
      binding.keys?.some((key) => this.pressed.has(resolveKeyCode(key) ?? key)) === true ||
      binding.mouseButtons?.some((button) => this.mousePressed.has(button)) === true
    );
  }

  getPointer(): Readonly<PointerState> {
    return { ...this.pointer };
  }

  getMouseButton(button: number): boolean {
    return this.mouseButtons.has(button);
  }

  requestPointerLock(element: HTMLElement): Promise<void> {
    return element.requestPointerLock();
  }

  exitPointerLock(): void {
    if (typeof document !== "undefined") document.exitPointerLock();
  }

  getKey(name: string): boolean {
    const code = resolveKeyCode(name);
    return code ? this.isKeyDown(code) : false;
  }

  private digital(keys: string[] | undefined): number {
    if (!keys) return 0;
    return keys.some((key) => this.keys.has(resolveKeyCode(key) ?? key)) ? 1 : 0;
  }
}

function currentGamepad(): Gamepad | null {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
  return (
    [...navigator.getGamepads()].find((gamepad): gamepad is Gamepad => gamepad !== null) ?? null
  );
}

function applyDeadzone(value: number, deadzone = 0.15): number {
  return Math.abs(value) < deadzone ? 0 : value;
}

function strongest(a: number, b: number): number {
  return Math.abs(a) >= Math.abs(b) ? a : b;
}

function resolveKeyCode(name: string): string | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (key === "space" || key === " ") return "Space";
  if (key === "enter" || key === "return") return "Enter";
  if (key === "escape" || key === "esc") return "Escape";
  if (key === "shift") return "ShiftLeft";
  if (key === "ctrl" || key === "control") return "ControlLeft";
  if (key === "alt") return "AltLeft";
  if (key.length === 1 && key >= "a" && key <= "z") return `Key${key.toUpperCase()}`;
  if (key.length === 1 && key >= "0" && key <= "9") return `Digit${key}`;
  if (/^(Key|Digit|Arrow|Numpad)/.test(name) || name === "Space") return name;
  return null;
}
