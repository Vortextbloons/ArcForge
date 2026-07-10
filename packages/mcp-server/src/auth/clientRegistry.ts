import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { threeforgeDir } from "./permissions.js";

export interface McpClientRecord {
  id: string;
  name: string;
  scopes: string[];
  pairedAt: string;
  lastUsedAt?: string;
  /** Local pairing token (not a remote OAuth access token). */
  token: string;
  revoked?: boolean;
}

export interface McpClientsFile {
  version: 1;
  clients: McpClientRecord[];
}

function clientsPath(projectRoot: string): string {
  return path.join(threeforgeDir(projectRoot), "mcp.clients.json");
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function loadClients(
  projectRoot: string
): Promise<McpClientsFile> {
  const file = clientsPath(projectRoot);
  if (!(await pathExists(file))) {
    return { version: 1, clients: [] };
  }
  const raw = JSON.parse(await fs.readFile(file, "utf8")) as McpClientsFile;
  return {
    version: 1,
    clients: Array.isArray(raw.clients) ? raw.clients : [],
  };
}

async function saveClients(
  projectRoot: string,
  data: McpClientsFile
): Promise<void> {
  await fs.mkdir(threeforgeDir(projectRoot), { recursive: true });
  await fs.writeFile(
    clientsPath(projectRoot),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8"
  );
}

export async function listClients(
  projectRoot: string
): Promise<Array<Omit<McpClientRecord, "token"> & { tokenPreview: string }>> {
  const data = await loadClients(projectRoot);
  return data.clients
    .filter((c) => !c.revoked)
    .map(({ token, ...rest }) => ({
      ...rest,
      tokenPreview: `${token.slice(0, 6)}…`,
    }));
}

export async function pairClient(
  projectRoot: string,
  input: { name: string; scopes?: string[]; clientId?: string }
): Promise<McpClientRecord> {
  const data = await loadClients(projectRoot);
  const now = new Date().toISOString();
  const record: McpClientRecord = {
    id: input.clientId ?? `client_${randomBytes(4).toString("hex")}`,
    name: input.name,
    scopes: input.scopes ?? [
      "project:read",
      "docs:read",
      "scene:read",
      "script:read",
      "build:preview",
    ],
    pairedAt: now,
    lastUsedAt: now,
    token: randomBytes(24).toString("hex"),
  };
  data.clients.push(record);
  await saveClients(projectRoot, data);
  return record;
}

export async function revokeClient(
  projectRoot: string,
  clientId: string
): Promise<boolean> {
  const data = await loadClients(projectRoot);
  const client = data.clients.find((c) => c.id === clientId);
  if (!client) return false;
  client.revoked = true;
  await saveClients(projectRoot, data);
  return true;
}
