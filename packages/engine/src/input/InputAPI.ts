export type Vec2 = { x: number; y: number };

/**
 * Browser-facing input for scripts.
 * Axes are named actions mapped to WASD/arrow keys for MVP.
 */
export class InputAPI {
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly released = new Set<string>();
  private bound = false;

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.keys.has(event.code)) {
      this.pressed.add(event.code);
    }
    this.keys.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
    this.released.add(event.code);
  };

  attach(target: Window | Document = window): void {
    if (this.bound) return;
    target.addEventListener("keydown", this.onKeyDown as EventListener);
    target.addEventListener("keyup", this.onKeyUp as EventListener);
    this.bound = true;
  }

  detach(target: Window | Document = window): void {
    if (!this.bound) return;
    target.removeEventListener("keydown", this.onKeyDown as EventListener);
    target.removeEventListener("keyup", this.onKeyUp as EventListener);
    this.bound = false;
    this.keys.clear();
    this.pressed.clear();
    this.released.clear();
  }

  /** Call at end of frame to clear edge-triggered state. */
  endFrame(): void {
    this.pressed.clear();
    this.released.clear();
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

  /**
   * Named action vectors.
   * - "move" / "horizontal": A/D or arrows → x
   * - "move" also includes W/S or arrows → y
   */
  getVector(action: string): Vec2 {
    if (action === "move" || action === "horizontal") {
      let x = 0;
      let y = 0;
      if (this.isKeyDown("KeyA") || this.isKeyDown("ArrowLeft")) x -= 1;
      if (this.isKeyDown("KeyD") || this.isKeyDown("ArrowRight")) x += 1;
      if (action === "move") {
        if (this.isKeyDown("KeyS") || this.isKeyDown("ArrowDown")) y -= 1;
        if (this.isKeyDown("KeyW") || this.isKeyDown("ArrowUp")) y += 1;
      }
      const len = Math.hypot(x, y);
      if (len > 1) {
        x /= len;
        y /= len;
      }
      return { x, y };
    }
    return { x: 0, y: 0 };
  }

  getAxis(action: string): number {
    if (action === "horizontal") return this.getVector("horizontal").x;
    if (action === "vertical") return this.getVector("move").y;
    return 0;
  }
}
