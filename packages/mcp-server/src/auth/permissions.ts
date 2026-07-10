import { promises as fs } from "node:fs";
import path from "node:path";
import {
  DEFAULT_POLICY,
  McpPolicySchema,
  TOOL_POLICY_MAP,
  type McpPolicy,
  type PermissionMode,
  type PolicyTool,
} from "./policyTypes.js";

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export function threeforgeDir(projectRoot: string): string {
  return path.join(projectRoot, ".threeforge");
}

export function policyPath(projectRoot: string): string {
  return path.join(threeforgeDir(projectRoot), "mcp.policy.json");
}

export async function loadOrCreatePolicy(projectRoot: string): Promise<McpPolicy> {
  const file = policyPath(projectRoot);
  if (await pathExists(file)) {
    const raw = JSON.parse(await fs.readFile(file, "utf8")) as unknown;
    return McpPolicySchema.parse(raw);
  }
  await fs.mkdir(threeforgeDir(projectRoot), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(DEFAULT_POLICY, null, 2)}\n`, "utf8");
  return structuredClone(DEFAULT_POLICY);
}

export interface PermissionDecision {
  allowed: boolean;
  mode: PermissionMode;
  capability: PolicyTool | "unknown";
  reason: string;
}

export interface PermissionOptions {
  /** Global readonly gate (CLI --readonly). */
  readonly: boolean;
  /**
   * When true (CLI --write / --approve-asks), treat policy "ask" as "allow".
   * Attached Tauri mode should keep ask requiring UI approval (future).
   */
  approveAsks: boolean;
  /** Attached to living editor — ask still blocks until UI exists. */
  attached: boolean;
}

/**
 * Resolve whether a tool call may proceed under project policy.
 */
export function decidePermission(
  policy: McpPolicy,
  toolName: string,
  options: PermissionOptions
): PermissionDecision {
  if (!policy.mcp.enabled) {
    return {
      allowed: false,
      mode: "deny",
      capability: TOOL_POLICY_MAP[toolName] ?? "unknown",
      reason: "MCP disabled in project policy",
    };
  }

  const capability = TOOL_POLICY_MAP[toolName];
  if (!capability) {
    return {
      allowed: false,
      mode: "deny",
      capability: "unknown",
      reason: `Unknown tool is denied by default: ${toolName}`,
    };
  }

  const configured = policy.mcp.allowedTools[capability] ?? policy.mcp.defaultMode;
  let mode: PermissionMode = configured;

  const isWrite =
    capability.endsWith(".write") ||
    capability === "asset.import" ||
    capability === "build.export" ||
    capability === "shell.run" ||
    capability === "dependency.install" ||
    capability === "engine.modify";

  if (options.readonly && isWrite) {
    return {
      allowed: false,
      mode: "deny",
      capability,
      reason: "Server started with --readonly; write tools are disabled",
    };
  }

  if (mode === "ask") {
    if (options.approveAsks && !options.attached) {
      mode = "allow";
    } else if (options.attached) {
      // Phase 6 MVP: no Tauri approval bridge yet — refuse asks in attached mode.
      return {
        allowed: false,
        mode: "ask",
        capability,
        reason:
          "Permission is 'ask' and attached approval UI is not available yet. Use --write in headless mode or allow the capability in mcp.policy.json.",
      };
    } else {
      return {
        allowed: false,
        mode: "ask",
        capability,
        reason:
          "Permission is 'ask'. Re-run with --write to auto-approve asks in headless mode, or set the capability to allow in .threeforge/mcp.policy.json.",
      };
    }
  }

  if (mode === "deny") {
    return {
      allowed: false,
      mode,
      capability,
      reason: `Policy denies ${capability}`,
    };
  }

  return {
    allowed: true,
    mode,
    capability,
    reason: "allowed",
  };
}
