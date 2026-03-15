import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { maybeLaunchApp } from "./launch.js";
import {
  visualAidShowArgumentsSchema,
  visualAidWorkspaceOverrideSchema,
} from "./payload.js";
import { visualAidServerInfo } from "./server-info.js";
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
  resolveWorkspace,
  writeWorkspaceState,
} from "./workspace.js";

const sourceCwd = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const textResult = (text: string, isError = false) => ({
  content: [{ type: "text" as const, text }],
  isError,
});

const getWorkspacePaths = async (cwdOverride?: string) => {
  if (cwdOverride) {
    return {
      workspace: {
        cwd: cwdOverride,
        source: "explicit-override" as const,
      },
      sessionPath: resolveSessionPath(cwdOverride),
      registryPath: resolveRegistryPath(cwdOverride),
    };
  }

  const workspace = await resolveWorkspace(process.cwd(), process.env);

  return {
    workspace,
    sessionPath: resolveSessionPath(workspace.cwd),
    registryPath: resolveRegistryPath(workspace.cwd),
  };
};

const getDiagnostics = async (cwdOverride?: string) => {
  const { workspace, sessionPath, registryPath } =
    await getWorkspacePaths(cwdOverride);
  const session = await readSession(sessionPath);
  const workspaceState = await readWorkspaceState(registryPath);

  return {
    server: {
      ...visualAidServerInfo,
    },
    session: {
      path: sessionPath,
      exists:
        session.openedAt !== null ||
        session.updatedAt !== null ||
        session.items.length > 0,
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
    workspace: {
      cwd: workspace.cwd,
      source: workspace.source,
      processCwd: process.cwd(),
    },
  };
};

const persistWorkspaceState = async (
  workspaceCwd: string,
  sessionPath: string,
  registryPath: string,
) => {
  const workspaceState = await readWorkspaceState(registryPath);

  await writeWorkspaceState(
    registryPath,
    applyWorkspaceSession(workspaceState, workspaceCwd, sessionPath),
  );
};

const server = new McpServer(visualAidServerInfo, {
  capabilities: {
    logging: {},
    resources: {},
    tools: {},
  },
});

server.registerTool(
  "visual-aid.status",
  {
    title: "Get visual-aid diagnostics",
    description:
      "Return a human-readable summary of the current MCP and session status.",
    inputSchema: visualAidWorkspaceOverrideSchema,
  },
  async ({ cwd }) => {
    const diagnostics = await getDiagnostics(cwd);

    return textResult(
      [
        `server=${diagnostics.server.name}@${diagnostics.server.version}`,
        `sessionPath=${diagnostics.session.path}`,
        `workspaceCwd=${diagnostics.workspace.cwd}`,
        `workspaceSource=${diagnostics.workspace.source}`,
        `processCwd=${diagnostics.workspace.processCwd}`,
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
    description:
      "Current diagnostic information for the visual-aid MCP server.",
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
    inputSchema: visualAidWorkspaceOverrideSchema,
  },
  async ({ cwd }) => {
    const launched = await maybeLaunchApp(sourceCwd);
    const now = new Date().toISOString();
    const { workspace, sessionPath, registryPath } =
      await getWorkspacePaths(cwd);
    const session = await readSession(sessionPath);
    const next = applyOpen(session, now);

    await writeSession(sessionPath, next);
    await persistWorkspaceState(workspace.cwd, sessionPath, registryPath);

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
    inputSchema: visualAidShowArgumentsSchema,
  },
  async ({ cwd, ...payload }) => {
    const launched = await maybeLaunchApp(sourceCwd);
    const now = new Date().toISOString();
    const { workspace, sessionPath, registryPath } =
      await getWorkspacePaths(cwd);
    const session = await readSession(sessionPath);
    const next = applyShow(session, payload, now);

    await writeSession(sessionPath, next);
    await persistWorkspaceState(workspace.cwd, sessionPath, registryPath);

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
    inputSchema: visualAidWorkspaceOverrideSchema,
  },
  async ({ cwd }) => {
    const { workspace, sessionPath, registryPath } =
      await getWorkspacePaths(cwd);
    const session = await readSession(sessionPath);
    const next = applyClear(session, new Date().toISOString());

    await writeSession(sessionPath, next);
    await persistWorkspaceState(workspace.cwd, sessionPath, registryPath);

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
