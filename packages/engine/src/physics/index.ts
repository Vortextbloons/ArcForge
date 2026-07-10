export type { PhysicsBackend, PhysicsBackendKind } from "./PhysicsBackend.js";
export { NullPhysicsBackend } from "./NullPhysicsBackend.js";
export {
  RapierPhysicsBackend,
  initRapier,
} from "./RapierPhysicsBackend.js";
export { PhysicsAPI, createPhysicsBackend } from "./PhysicsAPI.js";
