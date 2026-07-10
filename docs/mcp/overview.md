# MCP Server (Phase 5)

ThreeForge exposes a project MCP server for AI clients. Phase 5 is **read-only**.

## Launch

```bash
pnpm --filter @threeforge/mcp-server build
node packages/mcp-server/dist/cli.js --project ./examples/platformer --readonly
```

Editor MCP config example:

```json
{
  "mcpServers": {
    "threeforge-platformer": {
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
| `docs.read` | Read a `threeforge://` doc URI |
| `docs.list_sources` | List doc sources |
| `docs.refresh_index` | Rebuild docs index |
| `build.get_errors` | Scene validation + script diagnostics |

Write tools (`scene.create_entity`, `script.edit`, …) arrive in Phase 6.

## Resources

Indexed docs are also exposed as MCP resources with URIs like:

- `threeforge://docs/scripting/behaviour`
- `threeforge://docs/components/core.transform`
- `threeforge://docs/mcp/tools`
