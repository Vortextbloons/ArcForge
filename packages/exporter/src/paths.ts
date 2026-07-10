import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathExists } from "./fsUtils.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve monorepo `templates/three-vite-game` from the exporter package location.
 */
export async function resolveTemplateRoot(): Promise<string> {
  const candidates = [
    path.resolve(HERE, "../../../templates/three-vite-game"),
    path.resolve(HERE, "../../templates/three-vite-game"),
    path.resolve(process.cwd(), "templates/three-vite-game"),
  ];
  for (const candidate of candidates) {
    if (await pathExists(path.join(candidate, "package.json"))) {
      return candidate;
    }
  }
  throw new Error(
    "Could not find templates/three-vite-game. Run export from the ArcForge monorepo."
  );
}

/**
 * Resolve built engine / schemas package roots for vendoring.
 */
export async function resolveWorkspacePackage(name: "engine" | "schemas"): Promise<string> {
  const candidates = [
    path.resolve(HERE, `../../${name}`),
    path.resolve(HERE, `../../../packages/${name}`),
    path.resolve(process.cwd(), `packages/${name}`),
  ];
  for (const candidate of candidates) {
    if (await pathExists(path.join(candidate, "package.json"))) {
      return candidate;
    }
  }
  throw new Error(`Could not find packages/${name}`);
}
