export { InputAPI, type Vec2 } from "./input/InputAPI.js";

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
} from "./runtime/index.js";

// Scripting API
export {
  Behaviour,
  type GameContext,
  type BehaviourConstructor,
  EntityHandle,
  TransformHandle,
  EventBus,
  RuntimeLogger,
  type RuntimeLogEntry,
  type RuntimeLogLevel,
  type RuntimeLogListener,
  ScriptRegistry,
  ScriptSystem,
  typecheckScripts,
  type ScriptDiagnostic,
  type ScriptSource,
  type ScriptTypecheckResult,
} from "./scripting/index.js";
