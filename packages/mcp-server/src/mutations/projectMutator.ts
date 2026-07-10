import { promises as fs } from "node:fs";
import path from "node:path";
import {
  AddComponentCommand,
  CreateEntityCommand,
  DeleteEntityCommand,
  EditorSession,
  UpdateComponentCommand,
  createEntityId,
} from "@arcforge/editor-core";
import { CORE_COMPONENT_MAP, parseScene, type Prefab, type Scene } from "@arcforge/schemas";
import type { MutationResult } from "./types.js";
import {
  absUnderRoot,
  deepMerge,
  normalizeProjectRel,
  pathExists,
  validateComponents,
} from "./pathSafety.js";
import {
  createPrefabFile,
  createScriptFile,
  editScriptFile,
  listPrefabFiles,
  readPrefabFile,
  readScriptFile,
} from "./assetMutations.js";

/**
 * Headless project mutations — scenes go through editor-core commands.
 */
export class ProjectMutator {
  constructor(private readonly projectRoot: string) {}

  async loadSceneSession(sceneRel: string): Promise<{
    session: EditorSession;
    rel: string;
    before: Scene;
  }> {
    const rel = normalizeProjectRel(sceneRel, "scenes/");
    if (!rel.endsWith(".scene.json")) {
      throw new Error("Scene path must end with .scene.json");
    }
    const abs = absUnderRoot(this.projectRoot, rel);
    if (!(await pathExists(abs))) {
      throw new Error(`Scene not found: ${rel}`);
    }
    const before = parseScene(JSON.parse(await fs.readFile(abs, "utf8")) as unknown);
    const session = new EditorSession({ scene: before, scenePath: rel });
    return { session, rel, before };
  }

  private async saveScene(session: EditorSession, rel: string): Promise<Scene> {
    const scene = session.getScene();
    parseScene(scene);
    const abs = absUnderRoot(this.projectRoot, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, `${JSON.stringify(scene, null, 2)}\n`, "utf8");
    session.markSaved(rel);
    return scene;
  }

  async createEntity(input: {
    scene: string;
    name: string;
    parent?: string | null;
    id?: string;
    components?: Record<string, unknown>;
  }): Promise<MutationResult<{ entityId: string; scene: string }>> {
    const { session, rel, before } = await this.loadSceneSession(input.scene);
    const components = input.components ?? {
      "core.transform": {
        position: [0, 0.5, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    };
    validateComponents(components);

    const entityId = input.id ?? createEntityId();
    await session.execute(
      new CreateEntityCommand({
        id: entityId,
        name: input.name,
        parent: input.parent ?? null,
        components,
      })
    );
    const after = await this.saveScene(session, rel);

    return {
      ok: true,
      data: { entityId, scene: rel },
      paths: [rel],
      before,
      after,
    };
  }

  async updateComponent(input: {
    scene: string;
    entityId: string;
    component: string;
    patch: Record<string, unknown>;
    replace?: boolean;
  }): Promise<MutationResult<{ entityId: string; component: string }>> {
    const { session, rel, before } = await this.loadSceneSession(input.scene);
    const entity = session.findEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const current = entity.components[input.component];
    let nextData: unknown;

    if (current === undefined) {
      const def = CORE_COMPONENT_MAP[input.component];
      const defaults =
        def && typeof def.defaults === "object" && def.defaults
          ? structuredClone(def.defaults as Record<string, unknown>)
          : {};
      nextData = deepMerge(defaults, input.patch);
      validateComponents({
        [input.component]: nextData as Record<string, unknown>,
      });
      await session.execute(new AddComponentCommand(input.entityId, input.component, nextData));
    } else {
      const base =
        current && typeof current === "object" && !Array.isArray(current)
          ? (structuredClone(current) as Record<string, unknown>)
          : {};
      nextData = input.replace ? structuredClone(input.patch) : deepMerge(base, input.patch);
      validateComponents({
        [input.component]: nextData as Record<string, unknown>,
      });
      await session.execute(new UpdateComponentCommand(input.entityId, input.component, nextData));
    }

    const after = await this.saveScene(session, rel);
    return {
      ok: true,
      data: { entityId: input.entityId, component: input.component },
      paths: [rel],
      before,
      after,
    };
  }

  async deleteEntity(input: {
    scene: string;
    entityId: string;
  }): Promise<MutationResult<{ entityId: string }>> {
    const { session, rel, before } = await this.loadSceneSession(input.scene);
    await session.execute(new DeleteEntityCommand(input.entityId));
    const after = await this.saveScene(session, rel);
    return {
      ok: true,
      data: { entityId: input.entityId },
      paths: [rel],
      before,
      after,
    };
  }

  createPrefab(input: {
    path?: string;
    name: string;
    root?: Prefab["root"];
  }): Promise<MutationResult<{ path: string }>> {
    return createPrefabFile(this.projectRoot, input);
  }

  createScript(input: {
    path: string;
    purpose?: string;
    content?: string;
  }): Promise<MutationResult<{ path: string }>> {
    return createScriptFile(this.projectRoot, input);
  }

  editScript(input: { path: string; content: string }): Promise<MutationResult<{ path: string }>> {
    return editScriptFile(this.projectRoot, input);
  }

  readScript(scriptPath: string): Promise<{ path: string; content: string }> {
    return readScriptFile(this.projectRoot, scriptPath);
  }

  listPrefabs(): Promise<string[]> {
    return listPrefabFiles(this.projectRoot);
  }

  readPrefab(prefabPath: string): Promise<{ path: string; prefab: Prefab }> {
    return readPrefabFile(this.projectRoot, prefabPath);
  }
}
