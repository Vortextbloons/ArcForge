# Platformer — Project Conventions

## Naming

- Scripts: `noun.verb.ts` (e.g. `player.controller.ts`, `coin.collectable.ts`)
- Entities: stable string ids (`player`, `coin_01`)
- Components: namespaced ids (`core.transform`, `script.behaviour`)

## Editing

- Mutate scenes through editor commands / MCP tools only.
- Keep scripts small and focused; no private engine imports.
- Put design notes in `docs/` so `docs.get_relevant` can find them.

## Scripts folder

Only TypeScript Behaviour modules under `scripts/`. Register them on the runtime before play.
