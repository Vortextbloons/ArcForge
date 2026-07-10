# Platformer — Game Design

Simple 3D platformer demo for ArcForge.

## Loop

1. Player moves on a flat ground plane.
2. Coins are collectables that increment score / despawn.
3. Goal: validate editor + MCP scripting workflows, not a full game.

## Entities

- `player` — transform + mesh + `script.behaviour` (`scripts/player.controller.ts`)
- coins — collectable behaviour (`scripts/coin.collectable.ts`)
- ground / lights / camera — static scene setup
