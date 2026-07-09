import type { z } from "zod";
import type { ComponentDefinition, ComponentDocs, InspectorField } from "./types.js";

export function defineComponent<TSchema extends z.ZodTypeAny>(def: {
  id: string;
  displayName: string;
  schema: TSchema;
  defaults: z.infer<TSchema>;
  inspector: InspectorField[];
  docs: ComponentDocs;
}): ComponentDefinition<TSchema> {
  return {
    id: def.id,
    displayName: def.displayName,
    schema: def.schema,
    defaults: def.defaults,
    inspector: def.inspector,
    docs: def.docs,
  };
}
