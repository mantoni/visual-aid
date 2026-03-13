import type { VisualAidPayload, VisualAidSession } from "./bridge";

export type VisualAidState = {
  session: VisualAidSession;
  status: string;
};

export const formatLabels: Record<VisualAidPayload["format"], string> = {
  markdown: "Markdown",
  diff: "Unified Diff",
  mermaid: "Mermaid",
  excalidraw: "Excalidraw",
  html: "HTML",
};

export const samplePayload: VisualAidPayload = {
  version: 1,
  format: "markdown",
  title: "Scaffold Ready",
  summary: "The app shell is running and waiting for MCP payloads.",
  content: [
    "# visual-aid",
    "",
    "The renderer shell is ready for structured payloads.",
    "",
    "- format: markdown",
    "- source: scaffold bootstrap",
    "- next step: wire the MCP transport into the desktop host",
  ].join("\n"),
  metadata: {
    source: "bootstrap",
  },
};

export const sessionWithSample = (
  bootstrapPayload?: VisualAidPayload,
): VisualAidSession => ({
  openedAt: null,
  lastAction: "show",
  updatedAt: null,
  items: [bootstrapPayload ?? samplePayload],
});

export const statusForSession = (session: VisualAidSession) => {
  const current = session.items.at(-1);

  if (session.lastAction === "show" && current) {
    return `Received ${formatLabels[current.format]} payload`;
  }

  if (session.lastAction === "open") {
    return "App opened, waiting for payloads";
  }

  if (session.lastAction === "clear") {
    return session.items.length === 0 ? "Cleared" : "Renderer shell ready";
  }

  return "Renderer shell ready";
};

export const createInitialState = (
  useTauriBridge: boolean,
  bootstrapPayload?: VisualAidPayload,
): VisualAidState => ({
  session: useTauriBridge
    ? {
        openedAt: null,
        lastAction: "clear",
        updatedAt: null,
        items: [],
      }
    : sessionWithSample(bootstrapPayload),
  status: useTauriBridge ? "Connecting to desktop bridge" : "Renderer shell ready",
});

export const applyLocalShow = (
  session: VisualAidSession,
  payload: VisualAidPayload,
  updatedAt: string,
): VisualAidSession => ({
  openedAt: session.openedAt,
  lastAction: "show",
  updatedAt,
  items:
    payload.mode === "append" ? [...session.items, payload] : [payload],
});

export const applyLocalClear = (
  session: VisualAidSession,
  updatedAt: string,
): VisualAidSession => ({
  ...session,
  lastAction: "clear",
  updatedAt,
  items: [],
});
