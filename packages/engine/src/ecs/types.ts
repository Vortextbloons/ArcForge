/** Opaque entity identifier. */
export type EntityId = string;

export interface EntityRecord {
  id: EntityId;
  name: string;
  parent: EntityId | null;
  /** Component type id → parsed component data. */
  components: Map<string, unknown>;
}
