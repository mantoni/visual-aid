import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const createTransport = (cwd: string, sessionPath: string) =>
  new StdioClientTransport({
    command: process.execPath,
    args: [join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), "mcp/server.ts"],
    cwd,
    env: {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      VISUAL_AID_SESSION_PATH: sessionPath,
      VISUAL_AID_OPEN_COMMAND: "true",
    },
    stderr: "pipe",
  });

const createClient = () =>
  new Client(
    { name: "visual-aid-diagnostics-client", version: "0.1.0" },
    { capabilities: {} },
  );

const firstTextContent = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const entry = value[0];

  if (
    !entry ||
    typeof entry !== "object" ||
    !("type" in entry) ||
    !("text" in entry) ||
    entry.type !== "text" ||
    typeof entry.text !== "string"
  ) {
    return null;
  }

  return entry.text;
};

describe("MCP diagnostics spec", () => {
  let root = "";
  let sessionPath = "";
  let client: Client | null = null;
  let transport: StdioClientTransport | null = null;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "visual-aid-diag-"));
    sessionPath = join(root, "session.json");
    client = createClient();
    transport = createTransport(process.cwd(), sessionPath);
    await client.connect(transport);
  });

  afterEach(async () => {
    if (transport) {
      await transport.close();
    }

    await rm(root, { recursive: true, force: true });
  });

  it("VDI-TOOL-001 status tool returns server and session diagnostics", async () => {
    const before = await readFile(sessionPath, "utf8").catch(() => null);

    const result = await client!.callTool({
      name: "visual-aid.status",
      arguments: {},
    });

    expect(firstTextContent(result.content)).toContain("server=visual-aid@0.1.0");
    expect(firstTextContent(result.content)).toContain(`sessionPath=${sessionPath}`);

    const after = await readFile(sessionPath, "utf8").catch(() => null);
    expect(after).toBe(before);
  });

  it("VDI-RESOURCE-001 status resource is listed and readable", async () => {
    const resources = await client!.listResources();
    const statusResource = resources.resources.find(
      (resource) => resource.uri === "visual-aid://status",
    );

    expect(statusResource).toBeTruthy();

    const result = await client!.readResource({
      uri: "visual-aid://status",
    });
    const first = result.contents[0];

    expect(first?.mimeType).toBe("application/json");
    if (first && "text" in first) {
      expect(first.text).toContain('"name": "visual-aid"');
      expect(first.text).toContain(`"path": "${sessionPath.replaceAll("\\", "\\\\")}"`);
    }
  });
});
