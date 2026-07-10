# 27. Example AI Workflow

User asks in external editor:

```txt
Create a simple collectathon prototype with a player, coins, timer, and win screen.
```

AI should do:

```txt
1. project.get_info
2. docs.get_relevant
3. scene.list
4. scene.open Main
5. component.list
6. component.get_schema for needed components
7. prefab.create Coin
8. script.create coin.collectable.ts
9. script.create game.manager.ts
10. scene.create_entity Player
11. scene.create_entity TimerUI
12. scene.create_entity WinScreen
13. build.preview
14. script.typecheck
15. project.validate
16. summarize diff
```

The Tauri app should show:

```txt
Connected MCP client
Changed files
Created entities
Typecheck result
Live preview
Accept/revert buttons
```
