# 17. Per-Project MCP Authorization

## 17.1 Goal

Each project controls which AI clients/editors can access it.

Authorization must be:

```txt
Per-project
Scoped
Revocable
Audited
Safe by default
```

## 17.2 Project MCP Files

```txt
MyGame/.arcforge/
  mcp.policy.json
  mcp.clients.json
  mcp.audit.log
```

## 17.3 `mcp.policy.json`

```json
{
  "mcp": {
    "enabled": true,
    "defaultMode": "ask",
    "allowedTools": {
      "project.read": "allow",
      "docs.read": "allow",
      "docs.search": "allow",
      "scene.read": "allow",
      "scene.write": "ask",
      "prefab.write": "ask",
      "script.read": "allow",
      "script.write": "ask",
      "asset.import": "ask",
      "build.preview": "allow",
      "build.export": "ask",
      "dependency.install": "deny",
      "shell.run": "deny",
      "engine.modify": "deny"
    }
  }
}
```

## 17.4 Scopes

```txt
project:read
project:write
docs:read
scene:read
scene:write
prefab:read
prefab:write
script:read
script:write
asset:read
asset:import
build:preview
build:export
plugin:create
dependency:install
shell:run
engine:modify
```

Default trusted client scopes:

```txt
project:read
docs:read
scene:read
script:read
build:preview
```

Default write scopes require approval:

```txt
scene:write
prefab:write
script:write
asset:import
build:export
```

Dangerous scopes denied by default:

```txt
shell:run
dependency:install
engine:modify
```

## 17.5 Client Registry

`mcp.clients.json`

```json
{
  "trustedClients": [
    {
      "clientId": "cursor",
      "displayName": "Cursor",
      "scopes": [
        "project:read",
        "docs:read",
        "scene:read",
        "scene:write",
        "script:read",
        "script:write",
        "build:preview"
      ],
      "approvedAt": "2026-07-09T00:00:00Z",
      "lastUsedAt": "2026-07-09T00:00:00Z"
    }
  ]
}
```

Do not store raw secrets in this file.

Tokens should be stored in:

```txt
OS keychain
or user app data directory
```

## 17.6 Local Pairing Flow

MVP authorization should use local pairing.

```txt
1. User opens project in Tauri app.
2. User opens Project Settings → MCP Access.
3. User clicks "Connect Editor".
4. App shows editor config and a temporary pairing code.
5. User configures editor MCP server.
6. Editor starts MCP server.
7. MCP server asks app to approve client.
8. App shows permission prompt.
9. User approves scopes.
10. MCP server stores scoped token.
11. Future requests use that scoped token.
```

## 17.7 OAuth Future Mode

For remote HTTP MCP, use OAuth-style authorization.

The MCP authorization spec defines authorization for HTTP-based transports and uses OAuth concepts for restricted MCP servers.

Future architecture:

```txt
MCP server = protected resource server
Tauri app = local authorization server
Editor = OAuth client
Project token = scoped access token
```
