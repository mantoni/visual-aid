import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { VisualAidSession } from "../../mcp/session.js";
import type { VisualAidWorkspaceRegistryState } from "../../mcp/workspace.js";

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

const createTransport = (
  cwd: string,
  sessionPath: string,
  registryPath: string,
  envOverrides: NodeJS.ProcessEnv = {},
) =>
  new StdioClientTransport({
    command: process.execPath,
    args: [
      join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
      "mcp/server.ts",
    ],
    cwd,
    env: {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      VISUAL_AID_SESSION_PATH: sessionPath,
      VISUAL_AID_REGISTRY_PATH: registryPath,
      VISUAL_AID_OPEN_COMMAND: "true",
      ...envOverrides,
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
  let registryPath = "";
  let client: Client | null = null;
  let transport: StdioClientTransport | null = null;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "visual-aid-mcp-"));
    sessionPath = join(root, "session.json");
    registryPath = join(root, "registry.json");
    client = createClient();
    transport = createTransport(process.cwd(), sessionPath, registryPath);
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
      "visual-aid.status",
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

    const workspaceState = JSON.parse(
      await readFile(registryPath, "utf8"),
    ) as VisualAidWorkspaceRegistryState;

    expect(workspaceState.workspaces).toHaveLength(1);
    expect(workspaceState.workspaces[0]?.sessionPath).toBe(sessionPath);
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

  it("VAI-SHOW-002 show accepts JSON payloads through a real MCP call", async () => {
    await client!.callTool({
      name: "visual-aid.show",
      arguments: {
        version: 1,
        format: "json",
        content: '{"name":"visual-aid","ready":true}',
        mode: "replace",
      },
    });

    const session = JSON.parse(
      await readFile(sessionPath, "utf8"),
    ) as VisualAidSession;

    expect(session.lastAction).toBe("show");
    expect(session.items).toHaveLength(1);
    expect(session.items[0]?.format).toBe("json");
  });

  it("VAI-SHOW-003 show accepts source code payloads through a real MCP call", async () => {
    await client!.callTool({
      name: "visual-aid.show",
      arguments: {
        version: 1,
        format: "code",
        content: "export const status = 'ok';",
        language: "typescript",
        mode: "replace",
      },
    });

    const session = JSON.parse(
      await readFile(sessionPath, "utf8"),
    ) as VisualAidSession;

    expect(session.lastAction).toBe("show");
    expect(session.items).toHaveLength(1);
    expect(session.items[0]?.format).toBe("code");
    expect(session.items[0]?.language).toBe("typescript");
  });

  it("VAS-SHOW-003 append mode updates an existing item when the payload id matches", async () => {
    await client!.callTool({
      name: "visual-aid.show",
      arguments: {
        version: 1,
        id: "plan",
        format: "markdown",
        content: "# Draft",
        mode: "append",
      },
    });

    await client!.callTool({
      name: "visual-aid.show",
      arguments: {
        version: 1,
        id: "plan",
        format: "html",
        content: "<article>Updated</article>",
        mode: "append",
      },
    });

    const session = JSON.parse(
      await readFile(sessionPath, "utf8"),
    ) as VisualAidSession;

    expect(session.items).toHaveLength(1);
    expect(session.items[0]?.id).toBe("plan");
    expect(session.items[0]?.format).toBe("html");
  });

  it("VAI-SHOW-004 show accepts html wireframe payloads through a real MCP call", async () => {
    await client!.callTool({
      name: "visual-aid.show",
      arguments: {
        version: 1,
        format: "html",
        content: "<main><section>Wireframe</section></main>",
        presentation: "wireframe",
      },
    });

    const session = JSON.parse(
      await readFile(sessionPath, "utf8"),
    ) as VisualAidSession;

    expect(session.items).toHaveLength(1);
    expect(session.items[0]?.format).toBe("html");
    expect(session.items[0]?.presentation).toBe("wireframe");
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
    expect(firstTextContent(result.content)).toContain(
      "Input validation error",
    );
  });

  it("VAI-VALIDATION-002 unexpected payload fields are rejected", async () => {
    const result = await client!.callTool({
      name: "visual-aid.show",
      arguments: {
        version: 1,
        format: "code",
        content: "export const status = 'ok';",
        metadata: {
          language: "typescript",
        },
      },
    });

    expect(result.isError).toBe(true);
    expect(firstTextContent(result.content)).toContain(
      "Input validation error",
    );
  });

  it("VAI-VALIDATION-003 unsupported presentation values are rejected", async () => {
    const result = await client!.callTool({
      name: "visual-aid.show",
      arguments: {
        version: 1,
        format: "html",
        content: "<main>Invalid</main>",
        presentation: "mockup",
      },
    });

    expect(result.isError).toBe(true);
    expect(firstTextContent(result.content)).toContain(
      "Input validation error",
    );
  });

  it("VXT-WORKSPACE-002 workspace overrides attribute registry updates to the target project", async () => {
    const targetWorkspace = join(root, "target-project");

    if (transport) {
      await transport.close();
    }

    client = createClient();
    transport = createTransport(process.cwd(), sessionPath, registryPath, {
      VISUAL_AID_WORKSPACE_CWD: targetWorkspace,
    });
    await client.connect(transport);

    await client.callTool({
      name: "visual-aid.show",
      arguments: {
        version: 1,
        format: "markdown",
        content: "# External Workspace",
      },
    });

    const workspaceState = JSON.parse(
      await readFile(registryPath, "utf8"),
    ) as VisualAidWorkspaceRegistryState;

    expect(workspaceState.activeWorkspaceId).toBe(targetWorkspace);
    expect(workspaceState.workspaces[0]?.cwd).toBe(targetWorkspace);
    expect(workspaceState.workspaces[0]?.label).toBe("target-project");
  });

  it("VXT-WORKSPACE-006 registry stores workspace references without duplicating session content", async () => {
    await client!.callTool({
      name: "visual-aid.show",
      arguments: {
        version: 1,
        format: "markdown",
        content: "# Registry Reference",
      },
    });

    const registry = JSON.parse(await readFile(registryPath, "utf8")) as Record<
      string,
      unknown
    >;
    const firstWorkspace = Array.isArray(registry.workspaces)
      ? (registry.workspaces[0] as Record<string, unknown> | undefined)
      : undefined;

    expect(firstWorkspace?.sessionPath).toBe(sessionPath);
    expect("session" in (firstWorkspace ?? {})).toBe(false);
  });

  it("VXT-WORKSPACE-003 generic source-checkout config uses the caller cwd as the workspace", async () => {
    const callerWorkspace = await mkdtemp(join(tmpdir(), "visual-aid-caller-"));
    const resolvedCallerWorkspace = await realpath(callerWorkspace);

    if (transport) {
      await transport.close();
    }

    client = createClient();
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [
        join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
        join(process.cwd(), "mcp", "server.ts"),
      ],
      cwd: callerWorkspace,
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        VISUAL_AID_REGISTRY_PATH: registryPath,
        VISUAL_AID_OPEN_COMMAND: "true",
      },
      stderr: "pipe",
    });
    await client.connect(transport);

    await client.callTool({
      name: "visual-aid.show",
      arguments: {
        version: 1,
        format: "markdown",
        content: "# Generic Config",
      },
    });

    const callerSessionPath = join(
      resolvedCallerWorkspace,
      ".visual-aid",
      "session.json",
    );
    const session = JSON.parse(
      await readFile(callerSessionPath, "utf8"),
    ) as VisualAidSession;
    const workspaceState = JSON.parse(
      await readFile(registryPath, "utf8"),
    ) as VisualAidWorkspaceRegistryState;

    expect(session.lastAction).toBe("show");
    expect(workspaceState.activeWorkspaceId).toBe(resolvedCallerWorkspace);
    expect(workspaceState.workspaces[0]?.cwd).toBe(resolvedCallerWorkspace);
    expect(workspaceState.workspaces[0]?.sessionPath).toBe(callerSessionPath);

    await rm(callerWorkspace, { recursive: true, force: true });
  });

  it("VXT-WORKSPACE-004 generic source-checkout config ignores shell cwd fallbacks when the launcher cwd is root", async () => {
    const callerWorkspace = await mkdtemp(join(tmpdir(), "visual-aid-caller-"));
    const resolvedCallerWorkspace = await realpath(callerWorkspace);

    if (transport) {
      await transport.close();
    }

    client = createClient();
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [
        join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
        join(process.cwd(), "mcp", "server.ts"),
      ],
      cwd: "/",
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        PWD: resolvedCallerWorkspace,
        VISUAL_AID_SESSION_PATH: sessionPath,
        VISUAL_AID_REGISTRY_PATH: registryPath,
        VISUAL_AID_OPEN_COMMAND: "true",
      },
      stderr: "pipe",
    });
    await client.connect(transport);

    await client.callTool({
      name: "visual-aid.show",
      arguments: {
        version: 1,
        format: "markdown",
        content: "# Shell Workspace",
      },
    });

    const workspaceState = JSON.parse(
      await readFile(registryPath, "utf8"),
    ) as VisualAidWorkspaceRegistryState;

    expect(workspaceState.activeWorkspaceId).toBe("/");
    expect(workspaceState.workspaces[0]?.cwd).toBe("/");
    expect(workspaceState.workspaces[0]?.sessionPath).toBe(sessionPath);

    await rm(callerWorkspace, { recursive: true, force: true });
  });

  it("VXT-WORKSPACE-007 tool arguments can override the workspace cwd", async () => {
    const callerWorkspace = await mkdtemp(join(tmpdir(), "visual-aid-caller-"));
    const resolvedCallerWorkspace = await realpath(callerWorkspace);

    if (transport) {
      await transport.close();
    }

    client = createClient();
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [
        join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
        join(process.cwd(), "mcp", "server.ts"),
      ],
      cwd: "/",
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        VISUAL_AID_REGISTRY_PATH: registryPath,
        VISUAL_AID_OPEN_COMMAND: "true",
      },
      stderr: "pipe",
    });
    await client.connect(transport);

    await client.callTool({
      name: "visual-aid.show",
      arguments: {
        cwd: resolvedCallerWorkspace,
        version: 1,
        format: "markdown",
        content: "# Argument Workspace",
      },
    });

    const callerSessionPath = join(
      resolvedCallerWorkspace,
      ".visual-aid",
      "session.json",
    );
    const session = JSON.parse(
      await readFile(callerSessionPath, "utf8"),
    ) as VisualAidSession;
    const workspaceState = JSON.parse(
      await readFile(registryPath, "utf8"),
    ) as VisualAidWorkspaceRegistryState;

    expect(session.lastAction).toBe("show");
    expect(workspaceState.activeWorkspaceId).toBe(resolvedCallerWorkspace);
    expect(workspaceState.workspaces[0]?.cwd).toBe(resolvedCallerWorkspace);
    expect(workspaceState.workspaces[0]?.sessionPath).toBe(callerSessionPath);

    await rm(callerWorkspace, { recursive: true, force: true });
  });
});
