import type { BehaviourConstructor } from "./Behaviour.js";

/**
 * Maps script.behaviour module paths → Behaviour constructors.
 * Editor play mode and exported games register modules here.
 */
export class ScriptRegistry {
  private readonly modules = new Map<string, BehaviourConstructor>();

  register(modulePath: string, ctor: BehaviourConstructor): void {
    this.modules.set(normalizeModulePath(modulePath), ctor);
  }

  registerMany(
    entries: Record<string, BehaviourConstructor>
  ): void {
    for (const [path, ctor] of Object.entries(entries)) {
      this.register(path, ctor);
    }
  }

  get(modulePath: string): BehaviourConstructor | undefined {
    return this.modules.get(normalizeModulePath(modulePath));
  }

  has(modulePath: string): boolean {
    return this.modules.has(normalizeModulePath(modulePath));
  }

  list(): string[] {
    return [...this.modules.keys()].sort();
  }

  clear(): void {
    this.modules.clear();
  }
}

function normalizeModulePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}
