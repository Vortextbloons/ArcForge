# 3. Language and Technology Stack

## 3.1 Primary Stack

```txt
Editor UI:        React + TypeScript
Desktop Shell:   Tauri v2
Native Backend:  Rust
Runtime Engine:  TypeScript
Renderer:        Three.js
MCP Server:      TypeScript
Build System:    Vite
Validation:      Zod or Valibot
Testing:         Vitest + Playwright
Physics:         Rapier behind abstraction
Docs Index:      Local Markdown + generated schema docs + optional fetched references
```

## 3.2 Why TypeScript for the Engine

The engine, runtime, editor command system, MCP schemas, and exported projects should all be TypeScript.

Reasons:

- Three.js is naturally JavaScript/TypeScript-based.
- Exported projects remain understandable.
- AI coding tools handle TypeScript well.
- Component schemas can be reused across the editor, runtime, and MCP server.
- TypeScript makes it easy to export a normal Vite + Three.js project.

## 3.3 Why Rust for Tauri

Rust should be used for native desktop concerns only:

```txt
Filesystem access
Project folder permissions
Local process management
Build/export process spawning
OS dialogs
Sidecar process control
Secure token storage integration
File watching
```

Do not put gameplay logic in Rust for the MVP.
