#!/usr/bin/env node

import { MCPServer } from "./index";

const args = process.argv.slice(2);
const projectIndex = args.indexOf("--project");

if (projectIndex === -1 || !args[projectIndex + 1]) {
  console.error("Usage: threeforge-mcp --project <path>");
  process.exit(1);
}

const projectPath = args[projectIndex + 1];
const server: MCPServer = {
  async start(_path: string) {
    console.log("MCP Server starting...");
  },
  async stop() {
    console.log("MCP Server stopped");
  },
};

server.start(projectPath);
