# MCP Server (Phase 5)

ArcForge exposes a project MCP server for AI clients. Phase 5 is **read-only**.

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

### Read (Phase 5)

| Tool | Purpose |
| --- | --- |
| `project.get_info` | Project manifest metadata |
| `project.list_files` | List scenes/scripts/prefabs/docs |
| `scene.list` | List scenes |
| `scene.open` | Scene entity summary |
| `scene.get_entity` | One entity + components |
| `component.list` | Core component catalog |
| `component.get_schema` | One component schema/docs |
| `docs.search` | Search indexed docs |
| `docs.read` | Read a `arcforge://` doc URI |
| `docs.list_sources` | List doc sources |
| `docs.refresh_index` | Rebuild docs index |
| `build.get_errors` | Scene validation + script diagnostics |

### Write (Phase 6)

Enable with `--write`. Mutations go through **editor-core commands**, `.arcforge/mcp.policy.json`, audit log, and diff log.

| Tool | Purpose |
| --- | --- |
| `scene.create_entity` | Create entity via `CreateEntityCommand` |
| `scene.update_component` | Patch/replace component via commands |
| `scene.delete_entity` | Delete entity via `DeleteEntityCommand` |
| `prefab.list` / `prefab.read` / `prefab.create` | Prefab inspect + create |
| `script.read` / `script.create` / `script.edit` | Script inspect + write (typechecked) |
| `build.preview` | Preview marker (live viewport needs attached Tauri) |
| `diff.list` / `diff.summarize` | AI diff review |

```bash
pnpm mcp -- --project ./examples/platformer --write
```

Policy defaults: reads/docs/preview **allow**; scene/prefab/script writes **ask** (auto-approved with `--write` in headless mode); shell/engine **deny**.

Audit: `.arcforge/mcp.audit.log` · Diffs: `.arcforge/mcp.diff.json`


## Resources

Indexed docs are also exposed as MCP resources with URIs like:

- `arcforge://docs/scripting/behaviour`
- `arcforge://docs/components/core.transform`
- `arcforge://docs/mcp/tools`
