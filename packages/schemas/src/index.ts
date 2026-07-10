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
  ScriptBehaviourComponent,
  ScriptBehaviourSchema,
  type ScriptBehaviour,
  RigidbodyComponent,
  RigidbodySchema,
  RigidbodyTypeSchema,
  type Rigidbody,
  ColliderComponent,
  ColliderSchema,
  ColliderShapeSchema,
  type Collider,
  AudioSourceComponent,
  AudioSourceSchema,
  type AudioSource,
  AnimatorComponent,
  AnimatorSchema,
  type Animator,
  UiElementComponent,
  UiElementSchema,
  type UiElement,
  ParticleEmitterComponent,
  ParticleEmitterSchema,
  type ParticleEmitter,
  CORE_COMPONENTS,
  CORE_COMPONENT_MAP,
} from "./components/index.js";

export {
  ScriptModulePathSchema,
  parseScriptModulePath,
  type ScriptModulePath,
} from "./script.schema.js";

export {
  PluginManifestSchema,
  parsePluginManifest,
  PluginComponentDefSchema,
  parsePluginComponentDef,
  type PluginManifest,
  type PluginComponentDef,
} from "./plugin.schema.js";

export {
  AssetImportSettingsSchema,
  parseAssetImportSettings,
  defaultImportSettings,
  type AssetImportSettings,
} from "./asset.importSettings.schema.js";
