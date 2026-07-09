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

// Scripting API (minimal Phase 1 stub)
export { Behaviour, type GameContext } from "./scripting/Behaviour.js";
