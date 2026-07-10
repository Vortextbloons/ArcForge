# 28. Non-Negotiable Architecture Rules

```txt
1. The runtime must not depend on the editor.
2. The exported game must not include MCP.
3. MCP write tools must call editor commands.
4. AI must be able to read docs through MCP.
5. Component schemas must drive inspector UI and MCP validation.
6. Project authorization must be per project.
7. Dangerous tools must be denied by default.
8. Scene and prefab files must be portable JSON.
9. Scripts must use the public scripting API only.
10. Exported projects must be normal Three.js/Vite projects.
```
