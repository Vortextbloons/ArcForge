export { loadScene, worldToScene, type LoadedScene } from "./loadScene.js";
export { GameLoop, type TimeState, type FrameCallback, type GameLoopOptions } from "./GameLoop.js";
export { Runtime, type RuntimeOptions } from "./Runtime.js";
export {
  PrefabRegistry,
  instantiatePrefab,
  resolveScenePrefabs,
  type PrefabInstanceOptions,
} from "./PrefabRegistry.js";
export { SceneAPI } from "./SceneAPI.js";
