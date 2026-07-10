# 16. MCP Prompts

Expose reusable MCP prompts.

MCP prompts are designed as structured templates that clients can discover and retrieve for workflows.

Prompt examples:

```txt
prompt.create_game_prototype
prompt.add_gameplay_feature
prompt.fix_runtime_error
prompt.optimize_scene
prompt.export_game
prompt.explain_project
prompt.create_component
prompt.create_plugin
```

## 16.1 `prompt.add_gameplay_feature`

Arguments:

```json
{
  "feature": "string",
  "scene": "string"
}
```

Prompt behavior:

```txt
1. Read project info.
2. Search relevant docs.
3. Inspect scene.
4. Plan changes.
5. Apply scene/prefab/script changes.
6. Run validation.
7. Run typecheck.
8. Summarize diff.
```

## 16.2 `prompt.fix_runtime_error`

Arguments:

```json
{
  "error": "string",
  "scene": "string"
}
```

Prompt behavior:

```txt
1. Read build errors.
2. Read related script.
3. Search docs.
4. Apply minimal fix.
5. Typecheck.
6. Summarize result.
```
