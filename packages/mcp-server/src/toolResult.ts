import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** JSON tool payload helper. Keep stdout clean for stdio MCP transport. */
export function jsonResult(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function errorResult(message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}
