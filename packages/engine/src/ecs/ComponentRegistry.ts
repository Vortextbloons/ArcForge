import type { ComponentDocs, InspectorField } from "@arcforge/schemas";
import { CORE_COMPONENTS } from "@arcforge/schemas";

/** Loose component definition used by the registry. */
export type RegisteredComponent = {
  id: string;
  displayName: string;
  schema: { parse: (data: unknown) => unknown };
  defaults: unknown;
  inspector: InspectorField[];
  docs: ComponentDocs;
};

/**
 * Registry of known component definitions used for parsing and validation.
 */
export class ComponentRegistry {
  private readonly byId = new Map<string, RegisteredComponent>();

  constructor(initial: readonly RegisteredComponent[] = []) {
    for (const def of initial) {
      this.register(def);
    }
  }

  static withCore(): ComponentRegistry {
    return new ComponentRegistry(CORE_COMPONENTS as unknown as RegisteredComponent[]);
  }

  register(def: RegisteredComponent): void {
    if (this.byId.has(def.id)) {
      throw new Error(`Component already registered: ${def.id}`);
    }
    this.byId.set(def.id, def);
  }

  get(id: string): RegisteredComponent | undefined {
    return this.byId.get(id);
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  list(): RegisteredComponent[] {
    return [...this.byId.values()];
  }

  /** Parse raw JSON data with the component schema, applying defaults. */
  parse(typeId: string, raw: unknown): unknown {
    const def = this.byId.get(typeId);
    if (!def) {
      // Unknown components pass through unchanged (game/plugin components).
      return raw;
    }
    return def.schema.parse(raw ?? {});
  }
}
