export function createAgentsMarkdown(projectName: string): string {
  return `# AGENTS.md

## Project

This is **${projectName}**, an ArcForge game project. Build the game by editing its portable project data and scripts. This repository is the game itself, not the ArcForge editor or engine source.

## Project structure

- \`project.arcforge.json\`: project settings and default scene.
- \`scenes/*.scene.json\`: scene entities and components.
- \`prefabs/*.prefab.json\`: reusable entity hierarchies.
- \`scripts/*.ts\`: focused gameplay behaviours.
- \`assets/\`: models, textures, audio, and materials.
- \`docs/\`: game design and project conventions.

## Working rules

- Read \`docs/GAME_DESIGN.md\` and \`docs/PROJECT_CONVENTIONS.md\` before making broad gameplay changes.
- Prefer ArcForge MCP tools and validated scene, prefab, component, script, and asset commands when available.
- Search or read the ArcForge scripting and component documentation before using an unfamiliar API or component.
- Keep scene and prefab data in JSON. Do not move scene data into TypeScript.
- Use namespaced component IDs such as \`core.transform\`, \`render.mesh\`, \`physics.rigidbody\`, and \`script.behaviour\`.
- Keep scripts small and focused, with descriptive names such as \`player.controller.ts\` or \`coin.collectable.ts\`.
- Scripts may use only the documented public runtime API. Do not import ArcForge engine internals, editor code, Tauri, MCP server code, or private package paths.
- Reuse assets and materials where practical. Avoid per-frame allocations, unbounded loops, and unnecessary duplicate meshes.
- Do not edit generated cache, preview, build, audit, or index files inside ArcForge metadata directories.
- Do not add dependencies unless the game genuinely needs them and the project owner approves.

## Change order

Prefer the smallest suitable layer: scene or prefab data, then gameplay script, then component or system. Treat engine changes as out of scope for this game repository.

## Validation

After changes, validate affected scenes and prefabs, typecheck scripts, and run an ArcForge preview when available. Leave the project with no known validation errors.
`;
}

export function createClaudeMarkdown(projectName: string): string {
  return `# CLAUDE.md

This is the **${projectName}** ArcForge game project, not the ArcForge editor or engine repository.

Read and follow \`AGENTS.md\` before changing the game. It defines the project structure, safe editing boundaries, scripting rules, and required validation. Also read \`docs/GAME_DESIGN.md\` and \`docs/PROJECT_CONVENTIONS.md\` before broad gameplay changes.

When ArcForge MCP tools are available, prefer their validated scene, prefab, script, asset, documentation, preview, and export operations over raw file edits. Use only documented public runtime APIs in \`scripts/*.ts\`, keep scenes and prefabs as portable JSON, and never modify ArcForge engine or editor internals from this project.
`;
}
