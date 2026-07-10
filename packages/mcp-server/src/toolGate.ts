import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ProjectContext } from "./projectContext.js";
import { decidePermission } from "./auth/permissions.js";
import { errorResult, jsonResult } from "./toolResult.js";

export async function withPermission(
  ctx: ProjectContext,
  toolName: string,
  run: () => Promise<CallToolResult>
): Promise<CallToolResult> {
  const decision = decidePermission(ctx.policy, toolName, {
    readonly: ctx.readonly,
    approveAsks: ctx.approveAsks,
    attached: ctx.attached,
  });

  if (!decision.allowed) {
    await ctx.audit.append({
      clientId: ctx.clientId,
      tool: toolName,
      capability: String(decision.capability),
      ok: false,
      message: decision.reason,
    });
    return errorResult(
      `Permission denied (${decision.mode}) for ${toolName}: ${decision.reason}`
    );
  }

  try {
    const result = await run();
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.audit.append({
      clientId: ctx.clientId,
      tool: toolName,
      capability: String(decision.capability),
      ok: false,
      message,
    });
    return errorResult(message);
  }
}

export async function recordWriteSuccess(
  ctx: ProjectContext,
  toolName: string,
  summary: string,
  paths: string[],
  opts?: { before?: unknown; after?: unknown; validationOk?: boolean }
): Promise<void> {
  const capability = decidePermission(ctx.policy, toolName, {
    readonly: ctx.readonly,
    approveAsks: ctx.approveAsks,
    attached: ctx.attached,
  }).capability;

  await ctx.audit.append({
    clientId: ctx.clientId,
    tool: toolName,
    capability: String(capability),
    ok: true,
    message: summary,
    paths,
  });

  await ctx.diffs.record({
    clientId: ctx.clientId,
    tool: toolName,
    summary,
    paths,
    before: opts?.before,
    after: opts?.after,
    validationOk: opts?.validationOk ?? true,
  });
}

export { jsonResult, errorResult };
