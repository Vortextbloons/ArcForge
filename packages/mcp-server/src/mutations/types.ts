export interface MutationResult<T = unknown> {
  ok: true;
  data: T;
  paths: string[];
  before?: unknown;
  after?: unknown;
}
