// Core engine types
export type EntityId = string;

export interface EntityData {
  id: EntityId;
  name: string;
  parent: EntityId | null;
  components: Record<string, unknown>;
}

export interface GameContext {
  time: {
    delta: number;
    elapsed: number;
  };
  entity: EntityData;
  scene: SceneData;
}

export interface SceneData {
  version: number;
  name: string;
  entities: EntityData[];
}

export class Behaviour {
  update(_ctx: GameContext): void {}
  fixedUpdate(_ctx: GameContext): void {}
}
