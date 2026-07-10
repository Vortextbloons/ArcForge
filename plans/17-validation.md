# 23. Build Validation

Validation layers:

```txt
JSON schema validation
Component schema validation
Scene reference validation
Prefab reference validation
Asset reference validation
Script typecheck
Dependency check
Runtime smoke test
Export dry run
```

MCP tools should never apply invalid scene/component data.

Bad AI output should fail safely:

```txt
MCP tool call rejected
Validation errors returned to AI
No project file modified
Audit log records failed attempt
```
