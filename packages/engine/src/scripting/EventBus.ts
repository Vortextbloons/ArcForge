type EventHandler = (payload: unknown) => void;

/** Simple pub/sub for scripts and systems. */
export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  emit(event: string, payload?: unknown): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // Handlers may unsubscribe themselves while an event is being delivered.
    // oxlint-disable-next-line unicorn/no-useless-spread
    for (const handler of [...set]) {
      handler(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
