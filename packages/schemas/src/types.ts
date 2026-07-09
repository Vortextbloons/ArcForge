import type { z } from "zod";

/** Vec3 as a fixed-length number tuple. */
export type Vec3 = [number, number, number];

export type InspectorFieldType =
  | "number"
  | "boolean"
  | "string"
  | "vec3"
  | "enum"
  | "asset"
  | "color";

export interface InspectorField {
  key: string;
  label: string;
  type: InspectorFieldType;
  options?: string[];
}

export interface ComponentDocs {
  summary: string;
  aiUsage: string;
}

export interface ComponentDefinition<TSchema extends z.ZodTypeAny> {
  id: string;
  displayName: string;
  schema: TSchema;
  defaults: z.infer<TSchema>;
  inspector: InspectorField[];
  docs: ComponentDocs;
}
