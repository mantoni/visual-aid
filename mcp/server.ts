import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  type VisualAidPayload,
  visualAidPayloadSchema,
} from "./payload.js";

type VisualAidSession = {
  openedAt: string | null;
  lastAction: "open" | "show" | "clear";
  updatedAt: string | null;
  items: VisualAidPayload[];
};

const runtimeDir = join(process.cwd(), ".visual-aid");
const sessionPath = join(runtimeDir, "session.json");

const emptySession = (): VisualAidSession => ({
  openedAt: null,
  lastAction: "clear",
  updatedAt: null,
  items: [],
});

const readSession = async (): Promise<VisualAidSession> => {
  try {
    const raw = await readFile(sessionPath, "utf8");
    return JSON.parse(raw) as VisualAidSession;
  } catch {
    return emptySession();
  }
};

const writeSession = async (session: VisualAidSession) => {
  await mkdir(runtimeDir, { recursive: true });
  await writeFile(sessionPath, JSON.stringify(session, null, 2));
};

const textResult = (text: string, isError = false) => ({
  content: [{ type: "text" as const, text }],
  isError,
});

const maybeLaunchApp = () => {
  const command = process.env.VISUAL_AID_OPEN_COMMAND;

  if (!command) {
    return false;
  }

  spawn(command, {
    detached: true,
    shell: true,
    stdio: "ignore",
  }).unref();

  return true;
};

const server = new McpServer(
  {
    name: "visual-aid",
    version: "0.1.0",
  },
  {
    capabilities: {
      logging: {},
      tools: {},
    },
  },
);

server.registerTool(
  "visual-aid.open",
  {
    title: "Open visual-aid",
    description:
      "Launch the visual-aid desktop app or focus an existing instance.",
  },
  async () => {
    const launched = maybeLaunchApp();
    const now = new Date().toISOString();
    const session = await readSession();

    await writeSession({
      ...session,
      openedAt: session.openedAt ?? now,
      lastAction: "open",
      updatedAt: now,
    });

    return textResult(
      launched
        ? `visual-aid launch command executed. Session state recorded at ${sessionPath}.`
        : `visual-aid open recorded, but no launch command is configured. Set VISUAL_AID_OPEN_COMMAND to enable process launch. Session state recorded at ${sessionPath}.`,
    );
  },
);

server.registerTool(
  "visual-aid.show",
  {
    title: "Render structured payload",
    description:
      "Validate and record a structured payload for the visual-aid app.",
    inputSchema: visualAidPayloadSchema,
  },
  async (payload) => {
    const now = new Date().toISOString();
    const session = await readSession();
    const nextItems =
      payload.mode === "append" ? [...session.items, payload] : [payload];

    await writeSession({
      openedAt: session.openedAt,
      lastAction: "show",
      updatedAt: now,
      items: nextItems,
    });

    return textResult(
      `Accepted ${payload.format} payload in ${payload.mode ?? "replace"} mode. Session state recorded at ${sessionPath}.`,
    );
  },
);

server.registerTool(
  "visual-aid.clear",
  {
    title: "Clear rendered payloads",
    description: "Clear the active visual-aid session state.",
  },
  async () => {
    const session = await readSession();

    await writeSession({
      ...session,
      lastAction: "clear",
      updatedAt: new Date().toISOString(),
      items: [],
    });

    return textResult(`Cleared visual-aid session state at ${sessionPath}.`);
  },
);

const main = async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

main().catch((error) => {
  console.error("visual-aid MCP server failed:", error);
  process.exit(1);
});
