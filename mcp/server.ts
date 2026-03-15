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

const usageResourceText = `# Visual AId MCP server

Visual AId gives agents a desktop surface for artifacts that are easier to inspect visually than in terminal text.

## Use it for

- markdown plans, writeups, and reports
- source code snippets or full files
- JSON data
- unified diffs
- Mermaid diagrams
- HTML fragments and wireframes

## Tools

- \`visual-aid.status\`: inspect the server, workspace, and session path the call will use
- \`visual-aid.open\`: launch or focus the desktop app
- \`visual-aid.show\`: render a payload in the desktop app
- \`visual-aid.clear\`: clear the rendered items for the targeted workspace

## Markdown can already render inline

- headings, paragraphs, ordered and unordered lists, and blockquotes
- tables and links
- sanitized raw HTML snippets
- syntax-highlighted fenced code blocks
- embedded Mermaid fences
- embedded diff fences

## visual-aid.show required fields

- \`version\`: use \`1\`
- \`format\`: one of \`markdown\`, \`code\`, \`json\`, \`diff\`, \`mermaid\`, or \`html\`
- \`content\`: the raw content to render

## visual-aid.show optional fields

- \`title\`: user-facing title
- \`summary\`: short user-facing summary
- \`id\`: stable item id for append-mode replacement
- \`language\`: syntax-highlighting hint for code payloads
- \`presentation\`: renderer hint, currently \`default\` or \`wireframe\` for html payloads
- \`mode\`: \`replace\` or \`append\`
- \`cwd\`: target workspace directory for this call

## When to use html wireframe

Use \`format: "html"\` with \`presentation: "wireframe"\` when the user wants to inspect UI structure, layout, information hierarchy, or interaction flow without committing to final visual design.

Good wireframe payloads:

- use semantic HTML such as \`main\`, \`section\`, \`nav\`, \`aside\`, \`form\`, \`label\`, \`button\`, and lists
- focus on regions, hierarchy, and states
- optionally use helper classes such as \`va-stack\`, \`va-grid\`, \`va-sidebar\`, \`va-cluster\`, and \`va-spread\`
- avoid custom CSS unless the task truly needs richer html instead of a low-fidelity sketch

Prefer markdown instead when prose plus inline code, diff, mermaid, or small HTML snippets already communicate the idea.

## Example

\`\`\`json
{
  "version": 1,
  "format": "markdown",
  "title": "Plan",
  "summary": "Current implementation plan",
  "content": "# Plan\\n\\n- Inspect renderer\\n- Add tests\\n- Verify output"
}
\`\`\`
`;

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
    title: "Inspect Visual AId diagnostics",
    description:
      "Show which workspace, session file, and registry path Visual AId will use, plus the current session state.",
    inputSchema: visualAidWorkspaceOverrideSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
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
    title: "Visual AId status",
    description:
      "Current diagnostic information for the Visual AId MCP server.",
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

server.registerResource(
  "visual-aid-usage",
  "visual-aid://usage",
  {
    title: "Visual AId usage",
    description:
      "How and when to use Visual AId from MCP, including how to shape `visual-aid.show` payloads.",
    mimeType: "text/markdown",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "text/markdown",
        text: usageResourceText,
      },
    ],
  }),
);

server.registerTool(
  "visual-aid.open",
  {
    title: "Open the Visual AId desktop app",
    description:
      "Launch the Visual AId desktop window for the targeted workspace, or focus the existing instance if it is already running.",
    inputSchema: visualAidWorkspaceOverrideSchema,
    annotations: {
      idempotentHint: true,
    },
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
        ? `Visual AId launch executed via ${launched.source}. Session state recorded at ${sessionPath}.`
        : `Visual AId open recorded, but no app launch target was found. Set VISUAL_AID_OPEN_COMMAND or VISUAL_AID_APP_PATH, or build the desktop app so it can be auto-detected. Session state recorded at ${sessionPath}.`,
    );
  },
);

server.registerTool(
  "visual-aid.show",
  {
    title: "Render visual content in the desktop app",
    description:
      "Render markdown, code, json, diff, mermaid, or html content in the Visual AId desktop app for the targeted workspace.",
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
    title: "Clear the current visual output",
    description:
      "Remove the rendered items for the targeted workspace from the Visual AId desktop app.",
    inputSchema: visualAidWorkspaceOverrideSchema,
    annotations: {
      destructiveHint: true,
      idempotentHint: true,
    },
  },
  async ({ cwd }) => {
    const { workspace, sessionPath, registryPath } =
      await getWorkspacePaths(cwd);
    const session = await readSession(sessionPath);
    const next = applyClear(session, new Date().toISOString());

    await writeSession(sessionPath, next);
    await persistWorkspaceState(workspace.cwd, sessionPath, registryPath);

    return textResult(`Cleared Visual AId session state at ${sessionPath}.`);
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
