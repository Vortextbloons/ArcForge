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
  "asset.read",
  "asset.import",
  "plugin.read",
  "plugin.create",
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
    defaultMode: "allow",
    allowedTools: {
      "project.read": "allow",
      "docs.read": "allow",
      "docs.search": "allow",
      "scene.read": "allow",
      "scene.write": "allow",
      "prefab.read": "allow",
      "prefab.write": "allow",
      "script.read": "allow",
      "script.write": "allow",
      "asset.read": "allow",
      "asset.import": "allow",
      "plugin.read": "allow",
      "plugin.create": "allow",
      "build.preview": "allow",
      "build.export": "allow",
      "dependency.install": "ask",
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
  "scene.create": "scene.write",
  "scene.update_component": "scene.write",
  "scene.delete_entity": "scene.write",
  "scene.rename_entity": "scene.write",
  "scene.reparent_entity": "scene.write",
  "scene.duplicate_entity": "scene.write",
  "scene.remove_component": "scene.write",
  "scene.instantiate_prefab": "scene.write",
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
  "docs.get_relevant": "docs.search",
  "docs.list_sources": "docs.read",
  "docs.refresh_index": "docs.read",
  "plugin.list": "plugin.read",
  "plugin.read": "plugin.read",
  "plugin.validate": "plugin.read",
  "plugin.create": "plugin.create",
  "plugin.create_system": "plugin.create",
  "plugin.enable": "plugin.create",
  "plugin.disable": "plugin.create",
  "asset.list": "asset.read",
  "asset.inspect": "asset.read",
  "asset.get_import_settings": "asset.read",
  "asset.update_import_settings": "asset.import",
  "asset.import": "asset.import",
  "build.get_errors": "project.read",
  "build.preview": "build.preview",
  "diff.list": "project.read",
  "diff.summarize": "project.read",
  "auth.list_clients": "project.read",
  "auth.pair_client": "project.read",
  "auth.revoke_client": "project.read",
};
