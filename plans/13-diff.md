# 19. AI Diff Review

The app should show a diff panel for AI changes.

For every MCP write operation:

```txt
Show what changed
Show which client made the change
Show which MCP tool was used
Show validation result
Allow accept/revert
Allow trust similar action next time
```

For high-risk actions:

```txt
Require explicit approval before applying.
```

High-risk actions:

```txt
Deleting many entities
Editing more than N files
Adding dependencies
Modifying engine packages
Exporting outside project folder
Running shell commands
```
