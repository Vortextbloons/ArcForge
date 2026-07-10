export type TimerId = number;

interface TimerEntry {
  id: TimerId;
  remaining: number;
  interval: number | null;
  callback: () => void;
}

/** Deterministic game-time timers paused with the runtime loop. */
export class TimerAPI {
  private readonly timers = new Map<TimerId, TimerEntry>();
  private nextId = 1;

  setTimeout(callback: () => void, seconds: number): TimerId {
    return this.add(callback, seconds, null);
  }

  setInterval(callback: () => void, seconds: number): TimerId {
    if (seconds <= 0) throw new Error("Timer interval must be greater than zero");
    return this.add(callback, seconds, seconds);
  }

  clear(id: TimerId): void {
    this.timers.delete(id);
  }

  wait(seconds: number): Promise<void> {
    return new Promise((resolve) => this.setTimeout(resolve, seconds));
  }

  update(delta: number): void {
    // Snapshot because timer callbacks may add or clear timers during iteration.
    // oxlint-disable-next-line unicorn/no-useless-spread
    for (const timer of [...this.timers.values()]) {
      timer.remaining -= delta;
      while (timer.remaining <= 0 && this.timers.has(timer.id)) {
        timer.callback();
        if (timer.interval === null) {
          this.timers.delete(timer.id);
          break;
        }
        timer.remaining += timer.interval;
      }
    }
  }

  clearAll(): void {
    this.timers.clear();
  }

  private add(callback: () => void, seconds: number, interval: number | null): TimerId {
    const id = this.nextId++;
    this.timers.set(id, { id, remaining: Math.max(0, seconds), interval, callback });
    return id;
  }
}
