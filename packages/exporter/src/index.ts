import type { Scene } from "@threeforge/schemas";

export interface ExportOptions {
  output: string;
  optimize?: boolean;
  includeEngineSource?: boolean;
}

export async function exportWebBuild(
  _scene: Scene,
  _options: ExportOptions
): Promise<void> {
  console.log("Exporting web build...");
}

export async function exportThreeProject(
  _scene: Scene,
  _options: ExportOptions
): Promise<void> {
  console.log("Exporting Three.js project...");
}
