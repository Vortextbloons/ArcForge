export interface FrameProfilerSample {
  frameMs: number;
  updateMs: number;
  fixedUpdateMs: number;
  physicsMs: number;
  renderMs: number;
  entityCount: number;
  meshCount: number;
  lightCount: number;
  bodyCount: number;
}

/**
 * Lightweight CPU frame timings for the editor profiler panel.
 */
export class FrameProfiler {
  private enabled = false;
  private last: FrameProfilerSample = emptySample();
  private history: number[] = [];

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  beginSection(): number {
    return this.enabled ? performance.now() : 0;
  }

  endSection(start: number): number {
    if (!this.enabled) return 0;
    return performance.now() - start;
  }

  record(sample: FrameProfilerSample): void {
    if (!this.enabled) return;
    this.last = sample;
    this.history.push(sample.frameMs);
    if (this.history.length > 120) this.history.shift();
  }

  snapshot(): FrameProfilerSample & { avgFrameMs: number } {
    const avg =
      this.history.length === 0
        ? 0
        : this.history.reduce((a, b) => a + b, 0) / this.history.length;
    return { ...this.last, avgFrameMs: avg };
  }
}

function emptySample(): FrameProfilerSample {
  return {
    frameMs: 0,
    updateMs: 0,
    fixedUpdateMs: 0,
    physicsMs: 0,
    renderMs: 0,
    entityCount: 0,
    meshCount: 0,
    lightCount: 0,
    bodyCount: 0,
  };
}
