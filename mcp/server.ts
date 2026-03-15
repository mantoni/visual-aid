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
import {
  applyWorkspaceSession,
  readWorkspaceState,
  resolveRegistryPath,
  writeWorkspaceState,
} from "./workspace.js";

const cwd = process.cwd();
const sessionPath = resolveSessionPath(cwd);
const registryPath = resolveRegistryPath(cwd);

const textResult = (text: string, isError = false) => ({
  content: [{ type: "text" as const, text }],
  isError,
});

const getDiagnostics = async () => {
  const session = await readSession(sessionPath);
  const workspaceState = await readWorkspaceState(registryPath);

  return {
    server: {
      name: "visual-aid",
      version: "0.1.0",
    },
    session: {
      path: sessionPath,
      exists: session.openedAt !== null || session.updatedAt !== null || session.items.length > 0,
      lastAction: session.lastAction,
      itemCount: session.items.length,
      openedAt: session.openedAt,
      updatedAt: session.updatedAt,
    },
    workspaces: {
      path: registryPath,
      count: workspaceState.workspaces.length,
      activeWorkspaceId: workspaceState.activeWorkspaceId,
    },
  };
};

const persistWorkspaceState = async (session: Awaited<ReturnType<typeof readSession>>) => {
  const workspaceState = await readWorkspaceState(registryPath);

  await writeWorkspaceState(
    registryPath,
    applyWorkspaceSession(workspaceState, cwd, sessionPath, session),
  );
};

const server = new McpServer(
  {
    name: "visual-aid",
    version: "0.1.0",
  },
  {
    capabilities: {
      logging: {},
      resources: {},
      tools: {},
    },
  },
);

server.registerTool(
  "visual-aid.status",
  {
    title: "Get visual-aid diagnostics",
    description:
      "Return a human-readable summary of the current MCP and session status.",
  },
  async () => {
    const diagnostics = await getDiagnostics();

    return textResult(
      [
        `server=${diagnostics.server.name}@${diagnostics.server.version}`,
        `sessionPath=${diagnostics.session.path}`,
        `lastAction=${diagnostics.session.lastAction}`,
        `itemCount=${diagnostics.session.itemCount}`,
      ].join("\n"),
    );
  },
);

server.registerResource(
  "visual-aid-status",
  "visual-aid://status",
  {
    title: "visual-aid status",
    description: "Current diagnostic information for the visual-aid MCP server.",
    mimeType: "application/json",
  },
  async (uri) => {
    const diagnostics = await getDiagnostics();

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(diagnostics, null, 2),
        },
      ],
    };
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
    const next = applyOpen(session, now);

    await writeSession(sessionPath, next);
    await persistWorkspaceState(next);

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
    const next = applyShow(session, payload, now);

    await writeSession(sessionPath, next);
    await persistWorkspaceState(next);

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
    const next = applyClear(session, new Date().toISOString());

    await writeSession(sessionPath, next);
    await persistWorkspaceState(next);

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
