# 20. Audit Logging

Every MCP action must be logged.

`.arcforge/mcp.audit.log`

Example:

```json
{
  "time": "2026-07-09T00:00:00Z",
  "clientId": "cursor",
  "tool": "scene.update_component",
  "scope": "scene:write",
  "status": "allowed",
  "scene": "scenes/Main.scene.json",
  "summary": "Updated player health max from 100 to 150"
}
```

Audit log requirements:

```txt
Append-only
Human-readable summaries
No raw secrets
Project-local
Can be viewed in app
```
