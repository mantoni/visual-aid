import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
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
const sessionPath =
  process.env.VISUAL_AID_SESSION_PATH ?? join(runtimeDir, "session.json");

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

const detectLaunchTarget = async () => {
  if (process.env.VISUAL_AID_OPEN_COMMAND) {
    return {
      kind: "command" as const,
      value: process.env.VISUAL_AID_OPEN_COMMAND,
      source: "VISUAL_AID_OPEN_COMMAND",
    };
  }

  if (process.env.VISUAL_AID_APP_PATH) {
    return {
      kind: "bundle" as const,
      value: process.env.VISUAL_AID_APP_PATH,
      source: "VISUAL_AID_APP_PATH",
    };
  }

  const candidates = [
    {
      kind: "bundle" as const,
      value: join(
        process.cwd(),
        "src-tauri",
        "target",
        "release",
        "bundle",
        "macos",
        "visual-aid.app",
      ),
      source: "detected release app bundle",
    },
    {
      kind: "binary" as const,
      value: join(process.cwd(), "src-tauri", "target", "release", "visual-aid"),
      source: "detected release binary",
    },
    {
      kind: "binary" as const,
      value: join(process.cwd(), "src-tauri", "target", "debug", "visual-aid"),
      source: "detected debug binary",
    },
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate.value);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
};

const maybeLaunchApp = async () => {
  const launchTarget = await detectLaunchTarget();

  if (!launchTarget) {
    return null;
  }

  if (launchTarget.kind === "command") {
    spawn(launchTarget.value, {
      detached: true,
      shell: true,
      stdio: "ignore",
    }).unref();

    return launchTarget;
  }

  if (launchTarget.kind === "bundle") {
    spawn("open", [launchTarget.value], {
      detached: true,
      stdio: "ignore",
    }).unref();

    return launchTarget;
  }

  const command = process.env.VISUAL_AID_OPEN_COMMAND;

  spawn(launchTarget.value, {
    detached: true,
    stdio: "ignore",
  }).unref();

  return launchTarget;
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
    const launched = await maybeLaunchApp();
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
