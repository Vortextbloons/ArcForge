import { z } from "zod";

export const PermissionModeSchema = z.enum(["allow", "ask", "deny"]);
export type PermissionMode = z.infer<typeof PermissionModeSchema>;

export const PolicyToolSchema = z.enum([
  "project.read",
  "docs.read",
  "docs.search",
  "scene.read",
  "scene.write",
  "prefab.read",
  "prefab.write",
  "script.read",
  "script.write",
  "asset.import",
  "build.preview",
  "build.export",
  "dependency.install",
  "shell.run",
  "engine.modify",
]);

export type PolicyTool = z.infer<typeof PolicyToolSchema>;

export const McpPolicySchema = z.object({
  mcp: z.object({
    enabled: z.boolean().default(true),
    defaultMode: PermissionModeSchema.default("ask"),
    allowedTools: z.record(PermissionModeSchema).default({}),
  }),
});

export type McpPolicy = z.infer<typeof McpPolicySchema>;

export const DEFAULT_POLICY: McpPolicy = {
  mcp: {
    enabled: true,
    defaultMode: "ask",
    allowedTools: {
      "project.read": "allow",
      "docs.read": "allow",
      "docs.search": "allow",
      "scene.read": "allow",
      "scene.write": "ask",
      "prefab.read": "allow",
      "prefab.write": "ask",
      "script.read": "allow",
      "script.write": "ask",
      "asset.import": "ask",
      "build.preview": "allow",
      "build.export": "ask",
      "dependency.install": "deny",
      "shell.run": "deny",
      "engine.modify": "deny",
    },
  },
};

/** Map MCP tool name → policy capability. */
export const TOOL_POLICY_MAP: Record<string, PolicyTool> = {
  "project.get_info": "project.read",
  "project.list_files": "project.read",
  "scene.list": "scene.read",
  "scene.open": "scene.read",
  "scene.get_entity": "scene.read",
  "scene.create_entity": "scene.write",
  "scene.update_component": "scene.write",
  "scene.delete_entity": "scene.write",
  "prefab.list": "prefab.read",
  "prefab.read": "prefab.read",
  "prefab.create": "prefab.write",
  "script.list": "script.read",
  "script.read": "script.read",
  "script.create": "script.write",
  "script.edit": "script.write",
  "component.list": "project.read",
  "component.get_schema": "project.read",
  "docs.search": "docs.search",
  "docs.read": "docs.read",
  "docs.list_sources": "docs.read",
  "docs.refresh_index": "docs.read",
  "build.get_errors": "project.read",
  "build.preview": "build.preview",
  "diff.list": "project.read",
  "diff.summarize": "project.read",
};
