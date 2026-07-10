# 21. Export System

## 21.1 Export Playable Web Build

Output:

```txt
dist/
  index.html
  assets/
  game.js
  game.css
  project.data.json
```

Includes:

```txt
Three.js
runtime engine
compiled scripts
scene data
assets
```

Excludes:

```txt
Tauri
MCP server
React editor UI
inspector panels
editor command system
AI docs
audit logs
```

## 21.2 Export Editable Three.js Project

Output:

```txt
MyGameThreeProject/
  package.json
  vite.config.ts
  index.html
  src/
    main.ts
    game.ts
    runtime/
    scenes/
    prefabs/
    scripts/
  public/
    assets/
  README.md
```

This project should be usable with:

```bash
npm install
npm run dev
npm run build
```

## 21.3 Export Rules

The exporter must:

```txt
Validate scenes
Validate prefabs
Typecheck scripts
Resolve asset paths
Copy needed assets only
Tree-shake editor-only code
Generate package.json
Generate README
Create build report
```
