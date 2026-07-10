export type { PhysicsBackend, PhysicsBackendKind } from "./physics/PhysicsBackend.js";
export { NullPhysicsBackend } from "./physics/NullPhysicsBackend.js";
export { RapierPhysicsBackend, initRapier } from "./physics/RapierPhysicsBackend.js";
export { PhysicsAPI, createPhysicsBackend } from "./physics/PhysicsAPI.js";
export type {
  PhysicsCollisionEvent,
  PhysicsCollisionListener,
  RaycastHit,
} from "./physics/types.js";

export { FrameProfiler, type FrameProfilerSample } from "./profiler/FrameProfiler.js";

export { registerPluginComponents } from "./plugins/registerPluginComponents.js";
export {
  RuntimeExtensions,
  type RuntimeExtensionContext,
  type RuntimeSystem,
  type RuntimeRenderAdapter,
} from "./plugins/RuntimeExtensions.js";

export {
  InputAPI,
  type Vec2,
  type PointerState,
  type InputActionBinding,
  type InputActionMap,
} from "./input/InputAPI.js";

export { AssetManager, type AssetLoader, type AssetUrlResolver } from "./assets/index.js";
export { AudioSystem, AudioAPI } from "./audio/index.js";
export { AnimationSystem } from "./animation/index.js";
export { UiSystem } from "./ui/index.js";

// ECS
export type { EntityId, EntityRecord } from "./ecs/index.js";
export { World, ComponentRegistry } from "./ecs/index.js";

// Render
export {
  RenderBridge,
  type RendererOptions,
  syncTransforms,
  syncMeshes,
  syncCameras,
  syncLights,
  ParticleSystem,
} from "./render/index.js";

// Runtime
export {
  loadScene,
  worldToScene,
  type LoadedScene,
  GameLoop,
  type TimeState,
  type FrameCallback,
  type GameLoopOptions,
  Runtime,
  type RuntimeOptions,
  PrefabRegistry,
  instantiatePrefab,
  resolveScenePrefabs,
  type PrefabInstanceOptions,
  SceneAPI,
} from "./runtime/index.js";

// Scripting API
export {
  Behaviour,
  type GameContext,
  type BehaviourConstructor,
  EntityHandle,
  TransformHandle,
  EntityAPI,
  type SpawnEntityOptions,
  EventBus,
  RuntimeLogger,
  type RuntimeLogEntry,
  type RuntimeLogLevel,
  type RuntimeLogListener,
  ScriptRegistry,
  ScriptSystem,
  TimerAPI,
  type TimerId,
  StorageAPI,
} from "./scripting/index.js";
