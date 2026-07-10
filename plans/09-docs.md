# 15. Documentation System for AI

## 15.1 Goal

The MCP server must let AI pull project and engine docs before editing.

This is mandatory.

The AI should be able to ask:

```txt
What components exist?
How do I create a player controller?
What is the Transform schema?
How do prefabs work?
What tools am I allowed to call?
What are this project's conventions?
How do I export?
What are common performance rules?
```

## 15.2 Documentation Sources

The documentation system indexes:

```txt
Engine docs
Component schemas
Script API docs
Editor command docs
MCP tool docs
Project docs
Plugin docs
Asset import docs
Export docs
AI rules
Performance rules
Selected external references
```

Project docs:

```txt
MyGame/docs/GAME_DESIGN.md
MyGame/docs/AI_NOTES.md
MyGame/docs/PROJECT_CONVENTIONS.md
```

Engine docs:

```txt
docs/engine/
docs/scripting/
docs/components/
docs/plugins/
docs/exporting/
docs/ai-rules/
```

Generated docs:

```txt
.generated/docs/components.json
.generated/docs/script-api.json
.generated/docs/mcp-tools.json
```

## 15.3 MCP Documentation Resources

Expose docs as MCP resources.

Resource URI examples:

```txt
arcforge://docs/engine/overview
arcforge://docs/scripting/behaviour
arcforge://docs/components/core.transform
arcforge://docs/components/render.mesh
arcforge://docs/mcp/tools
arcforge://docs/project/conventions
arcforge://docs/project/game-design
arcforge://schemas/scene
arcforge://schemas/prefab
arcforge://schemas/component/game.health
```

Resources are appropriate here because MCP resources are designed to share contextual data, such as files or application-specific information, with models.

## 15.4 MCP Documentation Tools

### `docs.search`

Searches all indexed docs.

Input:

```json
{
  "query": "how to create a collectable coin",
  "scope": "all | engine | project | scripting | components | mcp | plugins",
  "limit": 8
}
```

Output:

```json
{
  "results": [
    {
      "title": "Collectable Component",
      "uri": "arcforge://docs/components/game.collectable",
      "snippet": "Use game.collectable for objects that trigger pickup behavior..."
    }
  ]
}
```

### `docs.read`

Reads one documentation resource.

Input:

```json
{
  "uri": "arcforge://docs/scripting/behaviour"
}
```

### `docs.list_sources`

Lists available doc sources.

Input:

```json
{}
```

### `docs.refresh_index`

Rebuilds the project docs index.

Input:

```json
{
  "includeProjectDocs": true,
  "includeGeneratedSchemas": true
}
```

### `docs.get_relevant`

Returns docs relevant to a task.

Input:

```json
{
  "task": "Add a third-person player with camera follow and coin pickup."
}
```

Output should include:

```txt
Relevant components
Relevant scripts
Relevant examples
Known project conventions
Allowed MCP tools
Potential warnings
```

## 15.5 Required AI Behavior

Before making non-trivial changes, the AI should call:

```txt
docs.get_relevant
project.get_info
component.list
scene.open
```

Before writing scripts, the AI should call:

```txt
script.get_api
docs.read arcforge://docs/scripting/behaviour
script.typecheck after editing
```

Before adding components, the AI should call:

```txt
component.get_schema
```

Before exporting, the AI should call:

```txt
project.validate
build.get_errors
```

## 15.6 Documentation Index Format

`.arcforge/docs.index.json`

```json
{
  "version": 1,
  "generatedAt": "2026-07-09T00:00:00Z",
  "sources": [
    {
      "uri": "arcforge://docs/scripting/behaviour",
      "title": "Behaviour Scripting API",
      "kind": "markdown",
      "path": "docs/scripting/behaviour.md",
      "tags": ["scripting", "runtime", "api"]
    }
  ]
}
```

## 15.7 AI-Facing Rules File

`docs/ai-rules/ENGINE_RULES.md`

```md
# Engine Rules for AI

Prefer these change types in order:

1. Scene JSON edits through MCP tools.
2. Prefab edits through MCP tools.
3. New isolated scripts.
4. New game components.
5. New plugins.
6. Engine core modifications only when explicitly requested.

Do not directly modify:
- engine/render/private
- engine/core/game-loop
- generated files
- build output
- package lockfiles unless installing dependencies was approved
```
