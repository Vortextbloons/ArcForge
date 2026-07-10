import { parseScene, type Scene } from "@arcforge/schemas";

/** Registered scene library and deferred scene-transition API. */
export class SceneAPI {
  private readonly scenes = new Map<string, Scene>();
  private pending: { path: string; scene: Scene } | null = null;
  private currentPath: string | null = null;

  register(path: string, data: unknown): Scene {
    const scene = parseScene(data);
    this.scenes.set(normalize(path), scene);
    return scene;
  }

  registerMany(entries: Record<string, unknown>): void {
    for (const [path, data] of Object.entries(entries)) this.register(path, data);
  }

  has(path: string): boolean {
    return this.scenes.has(normalize(path));
  }

  list(): string[] {
    return [...this.scenes.keys()];
  }

  clear(): void {
    this.scenes.clear();
    this.pending = null;
    this.currentPath = null;
  }

  load(path: string): void {
    const normalized = normalize(path);
    const scene = this.scenes.get(normalized);
    if (!scene) throw new Error(`Scene not registered: ${path}`);
    this.pending = { path: normalized, scene: structuredClone(scene) };
  }

  get current(): string | null {
    return this.currentPath;
  }

  _consumePending(): { path: string; scene: Scene } | null {
    const pending = this.pending;
    this.pending = null;
    return pending;
  }

  _setCurrent(path: string | null): void {
    this.currentPath = path;
  }
}

function normalize(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}
