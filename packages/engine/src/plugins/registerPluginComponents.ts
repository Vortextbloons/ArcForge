import type {
  PluginComponentDef,
  ComponentDocs,
  InspectorField,
} from "@arcforge/schemas";
import type { ComponentRegistry, RegisteredComponent } from "../ecs/ComponentRegistry.js";

/** Register plugin component defs onto a ComponentRegistry. */
export function registerPluginComponents(
  registry: ComponentRegistry,
  components: PluginComponentDef[]
): string[] {
  const registered: string[] = [];
  for (const def of components) {
    if (registry.has(def.id)) continue;
    registry.register(toRegisteredComponent(def));
    registered.push(def.id);
  }
  return registered;
}

function toRegisteredComponent(def: PluginComponentDef): RegisteredComponent {
  const docs: ComponentDocs = {
    summary: def.docs.summary || def.displayName,
    aiUsage: def.docs.aiUsage ?? `Plugin component ${def.id}`,
  };
  const allowed = new Set([
    "number",
    "boolean",
    "string",
    "vec3",
    "enum",
    "asset",
    "color",
  ]);
  const inspector: InspectorField[] = def.inspector.map((f) => ({
    key: f.key,
    label: f.label ?? f.key,
    type: (allowed.has(f.type) ? f.type : "string") as InspectorField["type"],
    options: f.options,
  }));

  return {
    id: def.id,
    displayName: def.displayName,
    defaults: def.defaults,
    inspector,
    docs,
    schema: {
      parse: (data: unknown) => ({
        ...def.defaults,
        ...(typeof data === "object" && data ? data : {}),
      }),
    },
  };
}
