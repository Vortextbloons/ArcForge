export { InputAPI, type Vec2 } from "../input/InputAPI.js";
export { Behaviour, type GameContext, type BehaviourConstructor } from "./Behaviour.js";
export { EntityHandle, TransformHandle } from "./EntityHandle.js";
export { EventBus } from "./EventBus.js";
export {
  RuntimeLogger,
  type RuntimeLogEntry,
  type RuntimeLogLevel,
  type RuntimeLogListener,
} from "./RuntimeLogger.js";
export { ScriptRegistry } from "./ScriptRegistry.js";
export { ScriptSystem } from "./ScriptSystem.js";
export {
  compileBehaviourModule,
  transpileBehaviourSource,
  type CompileBehaviourOutcome,
} from "./compileBehaviourModule.js";
export {
  typecheckScripts,
  type ScriptDiagnostic,
  type ScriptSource,
  type ScriptTypecheckResult,
} from "./typecheckScripts.js";
