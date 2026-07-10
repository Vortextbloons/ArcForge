/** Namespaced JSON persistence with an in-memory fallback. */
export class StorageAPI {
  private readonly memory = new Map<string, string>();

  constructor(private readonly namespace = "arcforge.game") {}

  get<T>(key: string, fallback: T): T {
    const raw = this.read(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  set(key: string, value: unknown): void {
    const raw = JSON.stringify(value);
    this.memory.set(key, raw);
    try {
      globalThis.localStorage?.setItem(this.fullKey(key), raw);
    } catch {
      // Sandboxed previews may not expose persistent storage; memory remains available.
    }
  }

  remove(key: string): void {
    this.memory.delete(key);
    try {
      globalThis.localStorage?.removeItem(this.fullKey(key));
    } catch {
      // Ignore unavailable storage.
    }
  }

  has(key: string): boolean {
    return this.read(key) !== null;
  }

  clear(): void {
    for (const key of this.keys()) this.remove(key);
  }

  keys(): string[] {
    const prefix = `${this.namespace}:`;
    const keys = new Set(this.memory.keys());
    try {
      for (let index = 0; index < globalThis.localStorage.length; index++) {
        const key = globalThis.localStorage.key(index);
        if (key?.startsWith(prefix)) keys.add(key.slice(prefix.length));
      }
    } catch {
      // Use memory keys only.
    }
    return [...keys];
  }

  private read(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(this.fullKey(key)) ?? this.memory.get(key) ?? null;
    } catch {
      return this.memory.get(key) ?? null;
    }
  }

  private fullKey(key: string): string {
    return `${this.namespace}:${key}`;
  }
}
