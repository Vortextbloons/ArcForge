import type { Scene } from "@arcforge/schemas";

export interface PerformanceWarning {
  code: string;
  message: string;
  path?: string;
  severity: "warning" | "info";
}

export interface PerformanceScanOptions {
  maxEntities?: number;
  maxDynamicLights?: number;
  maxSceneJsonBytes?: number;
  maxScriptBytes?: number;
  maxPhysicsBodies?: number;
}

export const PERFORMANCE_DEFAULTS: Required<PerformanceScanOptions> = {
  maxEntities: 500,
  maxDynamicLights: 8,
  maxSceneJsonBytes: 512_000,
  maxScriptBytes: 32_000,
  maxPhysicsBodies: 200,
};

/**
 * Lightweight static performance warnings for scenes (no filesystem / GPU).
 */
export function analyzeScenePerformance(
  scene: Scene,
  scenePath: string,
  options?: PerformanceScanOptions
): PerformanceWarning[] {
  const limits = { ...PERFORMANCE_DEFAULTS, ...options };
  const warnings: PerformanceWarning[] = [];

  if (scene.entities.length > limits.maxEntities) {
    warnings.push({
      code: "perf.entity-count",
      severity: "warning",
      path: scenePath,
      message: `Scene has ${scene.entities.length} entities (limit ${limits.maxEntities}). Prefer prefabs/instancing.`,
    });
  }

  let lights = 0;
  let bodies = 0;
  let meshes = 0;
  const materials = new Set<string>();

  for (const entity of scene.entities) {
    if (entity.components["render.light"]) lights += 1;
    if (entity.components["physics.rigidbody"]) bodies += 1;
    const mesh = entity.components["render.mesh"] as
      | { color?: string; primitive?: string }
      | undefined;
    if (mesh) {
      meshes += 1;
      materials.add(`${mesh.primitive ?? "box"}:${mesh.color ?? "#fff"}`);
    }
  }

  if (lights > limits.maxDynamicLights) {
    warnings.push({
      code: "perf.light-count",
      severity: "warning",
      path: scenePath,
      message: `Scene has ${lights} lights (limit ${limits.maxDynamicLights}).`,
    });
  }

  if (bodies > limits.maxPhysicsBodies) {
    warnings.push({
      code: "perf.physics-bodies",
      severity: "warning",
      path: scenePath,
      message: `Scene has ${bodies} rigidbodies (limit ${limits.maxPhysicsBodies}).`,
    });
  }

  if (materials.size > 32 && meshes > 32) {
    warnings.push({
      code: "perf.unique-materials",
      severity: "info",
      path: scenePath,
      message: `Estimated ${materials.size} unique mesh material variants. Prefer material reuse.`,
    });
  }

  return warnings;
}
