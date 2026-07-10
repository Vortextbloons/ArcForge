# 1. Product Goal

ArcForge is a desktop game editor and runtime framework for building shippable Three.js games with both visual user editing and AI-assisted development.

The system must support:

- A Unity-like desktop editor.
- A clean Three.js runtime.
- AI editing through MCP.
- Per-project MCP authorization.
- Live preview inside the desktop app.
- Export to playable web builds.
- Export to editable Three.js/Vite projects.
- AI-accessible documentation through MCP.
- Clean, maintainable, schema-driven project structure.

The central design rule:

```txt
The AI must edit the project through documented, validated engine APIs and editor commands, not by randomly modifying engine internals.
```

---

# 2. High-Level Architecture

```txt
External AI Editor / MCP Client
  ↓ MCP
Project MCP Server
  ↓ command bridge
Tauri Desktop App
  ↓
Editor Command System
  ↓
Project Files
  ↓
Three.js Runtime Preview
  ↓
Exporter
  ↓
Playable Web Build / Editable Three.js Project
```

System parts:

```txt
Tauri Desktop App
  ├─ Visual editor
  ├─ Scene viewport
  ├─ Inspector
  ├─ Asset browser
  ├─ Console
  ├─ AI/MCP session panel
  └─ Live runtime preview

TypeScript Engine
  ├─ ECS/entity model
  ├─ Scene loader
  ├─ Three.js renderer bridge
  ├─ Asset manager
  ├─ Input
  ├─ Audio
  ├─ Physics abstraction
  ├─ Scripting API
  └─ Runtime player

MCP Server
  ├─ Project inspection tools
  ├─ Scene editing tools
  ├─ Script editing tools
  ├─ Build/export tools
  ├─ Documentation tools
  ├─ Policy enforcement
  └─ Audit logging

Exporter
  ├─ Web build export
  ├─ Editable Three.js/Vite project export
  └─ Asset optimization pipeline
```
