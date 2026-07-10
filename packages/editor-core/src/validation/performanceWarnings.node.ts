import { promises as fs } from "node:fs";
import path from "node:path";
import type { Scene } from "@arcforge/schemas";
import {
  analyzeScenePerformance,
  PERFORMANCE_DEFAULTS,
  type PerformanceScanOptions,
  type PerformanceWarning,
} from "./performanceWarnings.js";

export {
  analyzeScenePerformance,
  PERFORMANCE_DEFAULTS,
  type PerformanceScanOptions,
  type PerformanceWarning,
} from "./performanceWarnings.js";

export async function analyzeProjectPerformance(
  projectRoot: string,
  scenes: Array<{ path: string; scene: Scene }>,
  scriptPaths: string[],
  options?: PerformanceScanOptions
): Promise<PerformanceWarning[]> {
  const limits = { ...PERFORMANCE_DEFAULTS, ...options };
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
