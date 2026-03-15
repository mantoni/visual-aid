import {
  emptySession,
  type VisualAidPayload,
  type VisualAidSession,
  type VisualAidWorkspaceState,
} from "./bridge";

export type VisualAidState = {
  session: VisualAidSession;
  status: string;
  selectedIndex: number | null;
  workspaceState?: VisualAidWorkspaceState;
  selectedWorkspaceId?: string | null;
};

export const formatLabels: Record<VisualAidPayload["format"], string> = {
  markdown: "Markdown",
  json: "JSON",
  diff: "Unified Diff",
  mermaid: "Mermaid",
  excalidraw: "Excalidraw",
  html: "HTML",
};

export const samplePayload: VisualAidPayload = {
  version: 1,
  format: "markdown",
  title: "visual-aid Ready",
  summary: "The app shell is ready for MCP payloads and local session recovery.",
  content: [
    "# visual-aid",
    "",
    "The renderer shell is ready for structured payloads.",
    "",
    "- format: markdown",
    "- source: bootstrap preview",
    "- history: newest payloads stay visible in the sidebar",
    "- recovery: the desktop host keeps the last good session snapshot",
  ].join("\n"),
  metadata: {
    source: "bootstrap",
  },
};

const sampleWorkspaceState = (
  bootstrapPayload?: VisualAidPayload,
): VisualAidWorkspaceState => ({
  activeWorkspaceId: "bootstrap",
  workspaces: [
    {
      id: "bootstrap",
      cwd: "/bootstrap",
      label: "Bootstrap",
      sessionPath: "local://bootstrap-session",
      session: sessionWithSample(bootstrapPayload),
    },
  ],
});

export const sessionWithSample = (
  bootstrapPayload?: VisualAidPayload,
): VisualAidSession => ({
  openedAt: null,
  lastAction: "show",
  updatedAt: null,
  items: [bootstrapPayload ?? samplePayload],
});

export const resolveSelectedWorkspaceId = (
  workspaceState: VisualAidWorkspaceState,
  selectedWorkspaceId: string | null | undefined,
) => {
  if (
    selectedWorkspaceId &&
    workspaceState.workspaces.some((workspace) => workspace.id === selectedWorkspaceId)
  ) {
    return selectedWorkspaceId;
  }

  if (
    workspaceState.activeWorkspaceId &&
    workspaceState.workspaces.some(
      (workspace) => workspace.id === workspaceState.activeWorkspaceId,
    )
  ) {
    return workspaceState.activeWorkspaceId;
  }

  return workspaceState.workspaces[0]?.id ?? null;
};

export const sessionForWorkspaceState = (
  workspaceState: VisualAidWorkspaceState | undefined,
  selectedWorkspaceId: string | null | undefined,
) => {
  if (!workspaceState) {
    return emptySession();
  }

  const resolvedWorkspaceId = resolveSelectedWorkspaceId(
    workspaceState,
    selectedWorkspaceId,
  );
  const workspace = workspaceState.workspaces.find(
    (entry) => entry.id === resolvedWorkspaceId,
  );

  return workspace?.session ?? emptySession();
};

export const newestItemIndex = (session: VisualAidSession) =>
  session.items.length === 0 ? null : session.items.length - 1;

export const resolveSelectedIndex = (
  session: VisualAidSession,
  selectedIndex: number | null,
) => {
  if (selectedIndex === null) {
    return newestItemIndex(session);
  }

  if (selectedIndex < 0 || selectedIndex >= session.items.length) {
    return newestItemIndex(session);
  }

  return selectedIndex;
};

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

export const statusForWorkspaceState = (
  workspaceState: VisualAidWorkspaceState | undefined,
  selectedWorkspaceId: string | null | undefined,
) => statusForSession(sessionForWorkspaceState(workspaceState, selectedWorkspaceId));

export const createInitialState = (
  useTauriBridge: boolean,
  bootstrapPayload?: VisualAidPayload,
): VisualAidState => {
  const workspaceState = useTauriBridge
    ? { activeWorkspaceId: null, workspaces: [] }
    : sampleWorkspaceState(bootstrapPayload);
  const selectedWorkspaceId = resolveSelectedWorkspaceId(workspaceState, null);
  const session = sessionForWorkspaceState(workspaceState, selectedWorkspaceId);

  return {
    workspaceState,
    session,
    status: useTauriBridge ? "Connecting to desktop bridge" : "Renderer shell ready",
    selectedIndex: newestItemIndex(session),
    selectedWorkspaceId,
  };
};

export const applyLocalShow = (
  session: VisualAidSession,
  payload: VisualAidPayload,
  updatedAt: string,
): VisualAidSession => {
  if (payload.mode !== "append") {
    return {
      openedAt: session.openedAt,
      lastAction: "show",
      updatedAt,
      items: [payload],
    };
  }

  const items = payload.id
    ? [...session.items.filter((item) => item.id !== payload.id), payload]
    : [...session.items, payload];

  return {
    openedAt: session.openedAt,
    lastAction: "show",
    updatedAt,
    items,
  };
};

export const applyLocalClear = (
  session: VisualAidSession,
  updatedAt: string,
): VisualAidSession => ({
  ...session,
  lastAction: "clear",
  updatedAt,
  items: [],
});

const replaceWorkspaceSession = (
  workspaceState: VisualAidWorkspaceState,
  selectedWorkspaceId: string | null | undefined,
  session: VisualAidSession,
) => {
  const resolvedWorkspaceId = resolveSelectedWorkspaceId(
    workspaceState,
    selectedWorkspaceId,
  );

  if (!resolvedWorkspaceId) {
    return workspaceState;
  }

  return {
    activeWorkspaceId: resolvedWorkspaceId,
    workspaces: workspaceState.workspaces.map((workspace) =>
      workspace.id === resolvedWorkspaceId ? { ...workspace, session } : workspace,
    ),
  };
};

export const applyLocalShowToWorkspaceState = (
  workspaceState: VisualAidWorkspaceState,
  selectedWorkspaceId: string | null | undefined,
  payload: VisualAidPayload,
  updatedAt: string,
) =>
  replaceWorkspaceSession(
    workspaceState,
    selectedWorkspaceId,
    applyLocalShow(
      sessionForWorkspaceState(workspaceState, selectedWorkspaceId),
      payload,
      updatedAt,
    ),
  );

export const applyLocalClearToWorkspaceState = (
  workspaceState: VisualAidWorkspaceState,
  selectedWorkspaceId: string | null | undefined,
  updatedAt: string,
) =>
  replaceWorkspaceSession(
    workspaceState,
    selectedWorkspaceId,
    applyLocalClear(
      sessionForWorkspaceState(workspaceState, selectedWorkspaceId),
      updatedAt,
    ),
  );
