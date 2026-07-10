# MCP Server (Phase 5–8)

ArcForge exposes a project MCP server for AI clients.

## Launch

```bash
pnpm --filter @arcforge/mcp-server build
node packages/mcp-server/dist/cli.js --project ./examples/platformer --readonly
```

Editor MCP config example:

```json
{
  "mcpServers": {
    "arcforge-platformer": {
      "command": "node",
      "args": [
        "C:/path/to/ArcForge/packages/mcp-server/dist/cli.js",
        "--project",
        "C:/path/to/ArcForge/examples/platformer",
        "--readonly"
      ]
    }
  }
}
```

## Tools

### Documentation (Phase 7)

| Tool                 | Purpose                                                         |
| -------------------- | --------------------------------------------------------------- |
| `docs.get_relevant`  | Task-scoped docs, components, scripts, conventions, warnings    |
| `docs.search`        | Search indexed docs                                             |
| `docs.read`          | Read a `arcforge://` doc URI                                    |
| `docs.list_sources`  | List doc sources                                                |
| `docs.refresh_index` | Rebuild index → `.arcforge/docs.index.json` + `.generated/docs` |

Before non-trivial edits, AI clients should call `docs.get_relevant`.

### Read (Phase 5)

| Tool                   | Purpose                               |
| ---------------------- | ------------------------------------- |
| `project.get_info`     | Project manifest metadata             |
| `project.list_files`   | List scenes/scripts/prefabs/docs      |
| `scene.list`           | List scenes                           |
| `scene.open`           | Scene entity summary                  |
| `scene.get_entity`     | One entity + components               |
| `component.list`       | Core component catalog                |
| `component.get_schema` | One component schema/docs             |
| `build.get_errors`     | Scene validation + script + performance warnings |

### Plugins / Assets / Auth (Phase 8)

| Tool | Purpose |
| --- | --- |
| `plugin.list` / `plugin.read` / `plugin.validate` | Inspect plugins |
| `plugin.create` / `plugin.enable` / `plugin.disable` | Scaffold / toggle (write) |
| `asset.list` / `asset.inspect` / `asset.get_import_settings` | Inspect assets |
| `asset.import` / `asset.update_import_settings` | Import + settings (write) |
| `auth.list_clients` / `auth.pair_client` / `auth.revoke_client` | Local pairing (OAuth deferred) |

### Write (Phase 6)

Enable with `--write`. Mutations go through **editor-core commands**, `.threeforge/mcp.policy.json`, audit log, and diff log.

| Tool                                            | Purpose                                             |
| ----------------------------------------------- | --------------------------------------------------- |
| `scene.create_entity`                           | Create entity via `CreateEntityCommand`             |
| `scene.update_component`                        | Patch/replace component via commands                |
| `scene.delete_entity`                           | Delete entity via `DeleteEntityCommand`             |
| `prefab.list` / `prefab.read` / `prefab.create` | Prefab inspect + create                             |
| `script.read` / `script.create` / `script.edit` | Script inspect + write (typechecked)                |
| `build.preview`                                 | Preview marker (live viewport needs attached Tauri) |
| `diff.list` / `diff.summarize`                  | AI diff review                                      |

```bash
pnpm mcp -- --project ./examples/platformer --write
```

Policy defaults: reads/docs/preview **allow**; scene/prefab/script writes **ask** (auto-approved with `--write` in headless mode); shell/engine **deny**.

Audit: `.threeforge/mcp.audit.log` · Diffs: `.threeforge/mcp.diff.json` · Docs index: `.arcforge/docs.index.json`

## Resources

Indexed docs are also exposed as MCP resources with URIs like:

- `arcforge://docs/scripting/behaviour`
- `arcforge://docs/components/core.transform`
- `arcforge://docs/ai-rules/ENGINE_RULES`
- `arcforge://docs/mcp/tools`
- `arcforge://project/PROJECT_CONVENTIONS`
