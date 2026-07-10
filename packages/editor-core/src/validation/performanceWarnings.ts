import { promises as fs } from "node:fs";
import path from "node:path";
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

const DEFAULTS: Required<PerformanceScanOptions> = {
  maxEntities: 500,
  maxDynamicLights: 8,
  maxSceneJsonBytes: 512_000,
  maxScriptBytes: 32_000,
  maxPhysicsBodies: 200,
};

/**
 * Lightweight static performance warnings for scenes/scripts (no GPU capture).
 */
export function analyzeScenePerformance(
  scene: Scene,
  scenePath: string,
  options?: PerformanceScanOptions
): PerformanceWarning[] {
  const limits = { ...DEFAULTS, ...options };
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

export async function analyzeProjectPerformance(
  projectRoot: string,
  scenes: Array<{ path: string; scene: Scene }>,
  scriptPaths: string[],
  options?: PerformanceScanOptions
): Promise<PerformanceWarning[]> {
  const limits = { ...DEFAULTS, ...options };
  const warnings: PerformanceWarning[] = [];

  for (const { path: scenePath, scene } of scenes) {
    warnings.push(...analyzeScenePerformance(scene, scenePath, limits));

    const abs = path.join(projectRoot, ...scenePath.split("/"));
    try {
      const stat = await fs.stat(abs);
      if (stat.size > limits.maxSceneJsonBytes) {
        warnings.push({
          code: "perf.scene-json-size",
          severity: "warning",
          path: scenePath,
          message: `Scene JSON is ${(stat.size / 1024).toFixed(1)} KB (limit ${(limits.maxSceneJsonBytes / 1024).toFixed(0)} KB).`,
        });
      }
    } catch {
      // ignore missing
    }
  }

  for (const rel of scriptPaths) {
    const abs = path.join(projectRoot, ...rel.split("/"));
    try {
      const stat = await fs.stat(abs);
      if (stat.size > limits.maxScriptBytes) {
        warnings.push({
          code: "perf.script-size",
          severity: "warning",
          path: rel,
          message: `Script is ${(stat.size / 1024).toFixed(1)} KB (limit ${(limits.maxScriptBytes / 1024).toFixed(0)} KB). Split into focused behaviours.`,
        });
      }
    } catch {
      // ignore
    }
  }

  return warnings;
}
