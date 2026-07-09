export interface TimeState {
  /** Seconds since last frame. */
  delta: number;
  /** Total seconds since start. */
  elapsed: number;
  /** Fixed timestep in seconds. */
  fixedDelta: number;
}

export type FrameCallback = (time: TimeState) => void;

export interface GameLoopOptions {
  /** Fixed update step (default 1/60). */
  fixedDelta?: number;
  /** Max catch-up fixed steps per frame. */
  maxSubSteps?: number;
}

/**
 * requestAnimationFrame loop with variable update + fixedUpdate accumulator.
 */
export class GameLoop {
  private running = false;
  private rafId = 0;
  private lastMs = 0;
  private elapsed = 0;
  private accumulator = 0;
  private readonly fixedDelta: number;
  private readonly maxSubSteps: number;

  private onUpdate: FrameCallback | null = null;
  private onFixedUpdate: FrameCallback | null = null;
  private onRender: FrameCallback | null = null;

  constructor(options: GameLoopOptions = {}) {
    this.fixedDelta = options.fixedDelta ?? 1 / 60;
    this.maxSubSteps = options.maxSubSteps ?? 5;
  }

  setUpdate(cb: FrameCallback): void {
    this.onUpdate = cb;
  }

  setFixedUpdate(cb: FrameCallback): void {
    this.onFixedUpdate = cb;
  }

  setRender(cb: FrameCallback): void {
    this.onRender = cb;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastMs = performance.now();
    this.tick(this.lastMs);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  get isRunning(): boolean {
    return this.running;
  }

  private tick = (nowMs: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);

    const rawDelta = Math.min((nowMs - this.lastMs) / 1000, 0.1);
    this.lastMs = nowMs;
    this.elapsed += rawDelta;

    const time: TimeState = {
      delta: rawDelta,
      elapsed: this.elapsed,
      fixedDelta: this.fixedDelta,
    };

    this.onUpdate?.(time);

    this.accumulator += rawDelta;
    let steps = 0;
    while (
      this.accumulator >= this.fixedDelta &&
      steps < this.maxSubSteps
    ) {
      this.onFixedUpdate?.({
        delta: this.fixedDelta,
        elapsed: this.elapsed,
        fixedDelta: this.fixedDelta,
      });
      this.accumulator -= this.fixedDelta;
      steps += 1;
    }
    // Drop leftover if we hit the cap to avoid spiral of death.
    if (steps === this.maxSubSteps) {
      this.accumulator = 0;
    }

    this.onRender?.(time);
  };
}
