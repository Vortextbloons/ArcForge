export type {
  Vec3,
  InspectorFieldType,
  InspectorField,
  ComponentDocs,
  ComponentDefinition,
} from "./types.js";

export { defineComponent } from "./defineComponent.js";
export { vec3 } from "./vec3.js";

export {
  EntitySchema,
  SceneSchema,
  parseScene,
  safeParseScene,
  type Entity,
  type Scene,
} from "./scene.schema.js";

export {
  PrefabSchema,
  PrefabNodeSchema,
  parsePrefab,
  type Prefab,
  type PrefabNode,
} from "./prefab.schema.js";

export {
  ProjectManifestSchema,
  parseProjectManifest,
  type ProjectManifest,
} from "./project.schema.js";

export {
  TransformComponent,
  TransformSchema,
  type Transform,
  MeshComponent,
  MeshSchema,
  MeshPrimitiveSchema,
  type Mesh,
  CameraComponent,
  CameraSchema,
  type Camera,
  LightComponent,
  LightSchema,
  LightTypeSchema,
  type Light,
  CORE_COMPONENTS,
  CORE_COMPONENT_MAP,
} from "./components/index.js";
