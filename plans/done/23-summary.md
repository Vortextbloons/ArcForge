# 29. Final System Summary

```txt
ArcForge is a Tauri desktop editor for building Three.js games.

The visual editor and external AI clients both modify projects through the same command system.

MCP provides the AI interface.

The MCP server exposes tools for actions, resources for docs/context, and prompts for workflows.

Per-project authorization controls what each editor or AI client can do.

The Tauri app shows live output through the preview bridge.

The exporter creates either a playable static web build or an editable Three.js/Vite project.

The AI is powerful because it can inspect docs, schemas, scenes, scripts, and build errors.

The codebase stays clean because the AI works through validated APIs instead of editing engine internals directly.
```
