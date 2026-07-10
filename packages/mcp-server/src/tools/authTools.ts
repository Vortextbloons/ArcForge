import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectContext } from "../projectContext.js";
import { withPermission, recordWriteSuccess } from "../toolGate.js";
import { errorResult, jsonResult } from "../toolResult.js";
import {
  listClients,
  pairClient,
  revokeClient,
} from "../auth/clientRegistry.js";

/**
 * Local pairing registry (Phase 8 MVP). Full OAuth/HTTP MCP is deferred.
 */
export function registerAuthTools(
  server: McpServer,
  ctx: ProjectContext
): void {
  server.registerTool(
    "auth.list_clients",
    {
      title: "List MCP clients",
      description:
        "Lists locally paired MCP clients for this project (tokens redacted).",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () =>
      withPermission(ctx, "auth.list_clients", async () => {
        const clients = await listClients(ctx.projectRoot);
        return jsonResult({ clients });
      })
  );

  server.registerTool(
    "auth.pair_client",
    {
      title: "Pair MCP client",
      description:
        "Creates a local pairing record + token in .threeforge/mcp.clients.json. Not remote OAuth.",
      inputSchema: {
        name: z.string(),
        scopes: z.array(z.string()).optional(),
        clientId: z.string().optional(),
      },
    },
    async (args) =>
      withPermission(ctx, "auth.pair_client", async () => {
        if (ctx.readonly) {
          return errorResult("Pairing requires --write (mutates mcp.clients.json)");
        }
        const client = await pairClient(ctx.projectRoot, args);
        await recordWriteSuccess(
          ctx,
          "auth.pair_client",
          `Paired client ${client.name}`,
          [".threeforge/mcp.clients.json"]
        );
        return jsonResult({
          id: client.id,
          name: client.name,
          scopes: client.scopes,
          token: client.token,
          pairedAt: client.pairedAt,
          note: "Store the token securely. Remote OAuth is not implemented yet.",
        });
      })
  );

  server.registerTool(
    "auth.revoke_client",
    {
      title: "Revoke MCP client",
      description: "Revokes a locally paired client by id.",
      inputSchema: { clientId: z.string() },
    },
    async ({ clientId }) =>
      withPermission(ctx, "auth.revoke_client", async () => {
        if (ctx.readonly) {
          return errorResult("Revoke requires --write");
        }
        const ok = await revokeClient(ctx.projectRoot, clientId);
        if (!ok) return errorResult(`Client not found: ${clientId}`);
        await recordWriteSuccess(
          ctx,
          "auth.revoke_client",
          `Revoked ${clientId}`,
          [".threeforge/mcp.clients.json"]
        );
        return jsonResult({ ok: true, clientId });
      })
  );
}
