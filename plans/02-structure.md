# 4. Repository Structure

```txt
threeforge/
  apps/
    editor-tauri/
      src/
        app/
        panels/
        viewport/
        inspector/
        hierarchy/
        asset-browser/
        console/
        mcp-access/
      src-tauri/
        src/
          main.rs
          commands/
          project_fs.rs
          process.rs
          auth.rs
          sidecar.rs

  packages/
    engine/
      src/
        core/
        ecs/
        render/
        assets/
        input/
        audio/
        physics/
        scripting/
        runtime/

    editor-core/
      src/
        commands/
        project/
        selection/
        undo/
        validation/
        diff/
        events/

    mcp-server/
      src/
        index.ts
        transport/
        auth/
        tools/
        resources/
        prompts/
        docs/
        audit/

    exporter/
      src/
        exportWebBuild.ts
        exportThreeProject.ts
        optimizeAssets.ts
        generatePackage.ts

    schemas/
      src/
        project.schema.ts
        scene.schema.ts
        prefab.schema.ts
        component.schema.ts
        script.schema.ts
        mcp.schema.ts

    docs-indexer/
      src/
        indexMarkdown.ts
        indexSchemas.ts
        searchDocs.ts

  templates/
    three-vite-game/
      package.json
      vite.config.ts
      index.html
      src/
        main.ts
        game.ts

  examples/
    platformer/
    third-person/
    arena-shooter/

  docs/
    engine/
    editor/
    scripting/
    components/
    mcp/
    plugins/
    exporting/
    ai-rules/
```

---

# 5. Project File Structure

Each user game project should be file-based and portable.

```txt
MyGame/
  project.threeforge.json

  .threeforge/
    project-id.json
    mcp.policy.json
    mcp.clients.json
    mcp.audit.log
    docs.index.json
    cache/
    preview/
    build/

  scenes/
    Main.scene.json
    Menu.scene.json

  prefabs/
    Player.prefab.json
    Enemy.prefab.json
    Coin.prefab.json

  scripts/
    player.controller.ts
    enemy.ai.ts
    coin.collectable.ts
    game.manager.ts

  assets/
    models/
    textures/
    audio/
    materials/

  plugins/
    inventory/
    dialogue/
    quest-system/

  docs/
    GAME_DESIGN.md
    AI_NOTES.md
    PROJECT_CONVENTIONS.md
```

---

# 6. Project Manifest

`project.threeforge.json`

```json
{
  "name": "MyGame",
  "engineVersion": "0.1.0",
  "defaultScene": "scenes/Main.scene.json",
  "render": {
    "backend": "webgl",
    "antialias": true,
    "shadows": true,
    "toneMapping": "aces"
  },
  "physics": {
    "enabled": true,
    "backend": "rapier"
  },
  "scripting": {
    "language": "typescript",
    "strict": true
  },
  "export": {
    "web": true,
    "editableThreeProject": true
  }
}
```
