export type RuntimeLogLevel = "info" | "warn" | "error";

export interface RuntimeLogEntry {
  id: string;
  level: RuntimeLogLevel;
  message: string;
  module?: string;
  entityId?: string;
  stack?: string;
  at: number;
}

export type RuntimeLogListener = (entry: RuntimeLogEntry) => void;

/** Collects script/runtime messages for the editor console panel. */
export class RuntimeLogger {
  private readonly entries: RuntimeLogEntry[] = [];
  private readonly listeners = new Set<RuntimeLogListener>();
  private readonly maxEntries: number;
  private seq = 0;

  constructor(maxEntries = 200) {
    this.maxEntries = maxEntries;
  }

  subscribe(listener: RuntimeLogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getEntries(): RuntimeLogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries.length = 0;
  }

  info(message: string, meta?: Partial<RuntimeLogEntry>): void {
    this.push("info", message, meta);
  }

  warn(message: string, meta?: Partial<RuntimeLogEntry>): void {
    this.push("warn", message, meta);
  }

  error(message: string, meta?: Partial<RuntimeLogEntry>): void {
    this.push("error", message, meta);
  }

  private push(
    level: RuntimeLogLevel,
    message: string,
    meta?: Partial<RuntimeLogEntry>
  ): void {
    const entry: RuntimeLogEntry = {
      id: `log_${++this.seq}`,
      level,
      message,
      module: meta?.module,
      entityId: meta?.entityId,
      stack: meta?.stack,
      at: Date.now(),
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
    for (const listener of this.listeners) {
      listener(entry);
    }
  }
}
