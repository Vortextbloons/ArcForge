export interface MCPServer {
  start(projectPath: string): Promise<void>;
  stop(): Promise<void>;
}
