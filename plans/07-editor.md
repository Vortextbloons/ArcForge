# 12. Editor Architecture

## 12.1 Editor Panels

The Tauri editor includes:

```txt
Scene Viewport
Hierarchy Panel
Inspector Panel
Asset Browser
Prefab Editor
Script Panel
Console Panel
Build Panel
MCP Access Panel
AI Diff Review Panel
Profiler Panel
Project Settings
```

## 12.2 Command System

All mutations must go through editor commands.

```ts
interface EditorCommand {
  id: string;
  label: string;
  execute(ctx: EditorContext): Promise<void>;
  undo(ctx: EditorContext): Promise<void>;
}
```

Command examples:

```txt
CreateEntityCommand
DeleteEntityCommand
RenameEntityCommand
AddComponentCommand
RemoveComponentCommand
UpdateComponentCommand
CreatePrefabCommand
InstantiatePrefabCommand
CreateScriptCommand
EditScriptCommand
ImportAssetCommand
SetProjectSettingCommand
```

Critical rule:

```txt
User UI actions and AI MCP actions must call the same command system.
```

This keeps undo/redo, validation, audit logs, and live preview consistent.
