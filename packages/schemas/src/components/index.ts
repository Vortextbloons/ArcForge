import type { ComponentDefinition } from "../types.js";
import { TransformComponent } from "./transform.js";
import { MeshComponent } from "./mesh.js";
import { CameraComponent } from "./camera.js";
import { LightComponent } from "./light.js";
import { ScriptBehaviourComponent } from "./scriptBehaviour.js";
import type { z } from "zod";

export { TransformComponent, TransformSchema, type Transform } from "./transform.js";
export { MeshComponent, MeshSchema, MeshPrimitiveSchema, type Mesh } from "./mesh.js";
export { CameraComponent, CameraSchema, type Camera } from "./camera.js";
export { LightComponent, LightSchema, LightTypeSchema, type Light } from "./light.js";
export {
  ScriptBehaviourComponent,
  ScriptBehaviourSchema,
  type ScriptBehaviour,
} from "./scriptBehaviour.js";

type AnyDef = ComponentDefinition<z.ZodTypeAny>;

/** Built-in components shipped with the engine. */
export const CORE_COMPONENTS: readonly AnyDef[] = [
  TransformComponent,
  MeshComponent,
  CameraComponent,
  LightComponent,
  ScriptBehaviourComponent,
];

export const CORE_COMPONENT_MAP: Record<string, AnyDef> = Object.fromEntries(
  CORE_COMPONENTS.map((c) => [c.id, c])
);
