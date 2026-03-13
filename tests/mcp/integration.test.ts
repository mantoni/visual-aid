import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { VisualAidSession } from "../../mcp/session.js";

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
    { name: "visual-aid-test-client", version: "0.1.0" },
    { capabilities: {} },
  );

describe("MCP stdio integration spec", () => {
  let root = "";
  let sessionPath = "";
  let client: Client | null = null;
  let transport: StdioClientTransport | null = null;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "visual-aid-mcp-"));
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

  it("VAI-LIST-001 MCP server exposes the documented tools", async () => {
    const tools = await client!.listTools();
    const names = tools.tools.map((tool) => tool.name).sort();

    expect(names).toEqual([
      "visual-aid.clear",
      "visual-aid.open",
      "visual-aid.show",
    ]);
  });

  it("VAI-SHOW-001 show writes the session file through a real MCP call", async () => {
    await client!.callTool({
      name: "visual-aid.show",
      arguments: {
        version: 1,
        format: "markdown",
        content: "# Integration",
        mode: "replace",
      },
    });

    const session = JSON.parse(
      await readFile(sessionPath, "utf8"),
    ) as VisualAidSession;

    expect(session.lastAction).toBe("show");
    expect(session.items).toHaveLength(1);
    expect(session.items[0]?.format).toBe("markdown");
  });

  it("VAI-CLEAR-001 clear empties the session file through a real MCP call", async () => {
    await client!.callTool({
      name: "visual-aid.show",
      arguments: {
        version: 1,
        format: "markdown",
        content: "# Integration",
        mode: "replace",
      },
    });

    await client!.callTool({
      name: "visual-aid.clear",
      arguments: {},
    });

    const session = JSON.parse(
      await readFile(sessionPath, "utf8"),
    ) as VisualAidSession;

    expect(session.lastAction).toBe("clear");
    expect(session.items).toHaveLength(0);
  });

  it("VAI-VALIDATION-001 invalid show payloads are rejected", async () => {
    const result = await client!.callTool({
      name: "visual-aid.show",
      arguments: {
        version: 1,
        format: "unsupported-format",
        content: "# Invalid",
      },
    });

    expect(result.isError).toBe(true);
    expect(firstTextContent(result.content)).toContain("Input validation error");
  });
});
