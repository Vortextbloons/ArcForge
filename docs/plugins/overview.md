# Plugins Overview

Plugins extend ArcForge with optional game systems (inventory, dialogue, quests, etc.).

MVP note: the full plugin loader is Phase 8. Until then:

- Keep feature logic in project scripts and scene/prefab data
- Prefer schema-driven components over engine forks
- Do not import private engine modules from plugins

When plugins land, each package will include a `plugin.arcforge.json` manifest and optional docs indexed under `docs/plugins/`.
