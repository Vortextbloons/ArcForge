export interface PhysicsCollisionEvent {
  entityA: string;
  entityB: string;
  started: boolean;
}

export interface RaycastHit {
  entityId: string;
  distance: number;
  point: [number, number, number];
  normal: [number, number, number];
}

export type PhysicsCollisionListener = (event: PhysicsCollisionEvent) => void;
