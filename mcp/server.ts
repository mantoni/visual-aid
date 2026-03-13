import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { maybeLaunchApp } from "./launch.js";
import { visualAidPayloadSchema } from "./payload.js";
import {
  applyClear,
  applyOpen,
  applyShow,
  readSession,
  resolveSessionPath,
  writeSession,
} from "./session.js";

const sessionPath = resolveSessionPath();

const textResult = (text: string, isError = false) => ({
  content: [{ type: "text" as const, text }],
  isError,
});

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
    const launched = await maybeLaunchApp();
    const now = new Date().toISOString();
    const session = await readSession(sessionPath);

    await writeSession(sessionPath, applyOpen(session, now));

    return textResult(
      launched
        ? `visual-aid launch executed via ${launched.source}. Session state recorded at ${sessionPath}.`
        : `visual-aid open recorded, but no app launch target was found. Set VISUAL_AID_OPEN_COMMAND or VISUAL_AID_APP_PATH, or build the desktop app so it can be auto-detected. Session state recorded at ${sessionPath}.`,
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
    const launched = await maybeLaunchApp();
    const now = new Date().toISOString();
    const session = await readSession(sessionPath);

    await writeSession(sessionPath, applyShow(session, payload, now));

    return textResult(
      `Accepted ${payload.format} payload in ${payload.mode ?? "replace"} mode. ${launched ? `Launch checked via ${launched.source}. ` : ""}Session state recorded at ${sessionPath}.`,
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
    const session = await readSession(sessionPath);

    await writeSession(sessionPath, applyClear(session, new Date().toISOString()));

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
