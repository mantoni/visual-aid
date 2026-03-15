import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type VisualAidFormat =
  | "markdown"
  | "code"
  | "json"
  | "diff"
  | "mermaid"
  | "html";
type VisualAidMode = "replace" | "append";

export type VisualAidPayload = {
  version: 1;
  format: VisualAidFormat;
  content: string;
  id?: string;
  title?: string;
  summary?: string;
  language?: string;
  mode?: VisualAidMode;
};

export type VisualAidSession = {
  openedAt: string | null;
  lastAction: "open" | "show" | "clear";
  updatedAt: string | null;
  items: VisualAidPayload[];
};

export type VisualAidWorkspace = {
  id: string;
  cwd: string;
  label: string;
  sessionPath: string;
  session: VisualAidSession;
};

export type VisualAidWorkspaceState = {
  activeWorkspaceId: string | null;
  workspaces: VisualAidWorkspace[];
};

export const SESSION_UPDATED_EVENT = "visual-aid:session-updated";

const canonicalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeValue(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );

    return Object.fromEntries(
      entries.map(([key, nested]) => [key, canonicalizeValue(nested)]),
    );
  }

  return value;
};

export const sessionSnapshot = (session: VisualAidSession) =>
  JSON.stringify(canonicalizeValue(session));

export const workspaceStateSnapshot = (
  workspaceState: VisualAidWorkspaceState,
) => JSON.stringify(canonicalizeValue(workspaceState));

export const isTauriEnvironment = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const emptySession = (): VisualAidSession => ({
  openedAt: null,
  lastAction: "clear",
  updatedAt: null,
  items: [],
});

export const emptyWorkspaceState = (): VisualAidWorkspaceState => ({
  activeWorkspaceId: null,
  workspaces: [],
});

export const closeWorkspaceSession = (workspaceId: string) =>
  invoke<VisualAidWorkspaceState>("close_workspace", { workspaceId });

export const syncWorkspaceState = async (
  lastSeen: string,
  invokeWorkspaceState: () => Promise<VisualAidWorkspaceState>,
  onWorkspaceState: (workspaceState: VisualAidWorkspaceState) => void,
) => {
  const workspaceState = await invokeWorkspaceState();
  const next = workspaceStateSnapshot(workspaceState);

  if (next !== lastSeen) {
    onWorkspaceState(workspaceState);
  }

  return next;
};

type SessionBridgeOptions = {
  enabled?: boolean;
  invokeWorkspaceState?: () => Promise<VisualAidWorkspaceState>;
  subscribeWorkspaceState?: (
    onWorkspaceState: (workspaceState: VisualAidWorkspaceState) => void,
  ) => Promise<() => void> | (() => void);
  onError?: (error: unknown) => void;
};

export const startSessionBridge = async (
  onWorkspaceState: (workspaceState: VisualAidWorkspaceState) => void,
  options?: SessionBridgeOptions,
) => {
  const enabled = options?.enabled ?? isTauriEnvironment();

  if (!enabled) {
    return () => {};
  }

  let lastSeen = "";
  const invokeWorkspaceState =
    options?.invokeWorkspaceState ??
    (() => invoke<VisualAidWorkspaceState>("read_workspace_state"));
  const subscribeWorkspaceState =
    options?.subscribeWorkspaceState ??
    ((
      handleWorkspaceState: (workspaceState: VisualAidWorkspaceState) => void,
    ) =>
      listen<VisualAidWorkspaceState>(SESSION_UPDATED_EVENT, (event) => {
        handleWorkspaceState(event.payload);
      }));
  const onError =
    options?.onError ??
    ((error: unknown) => {
      console.error("Failed to sync visual-aid session:", error);
    });
  const handleWorkspaceState = (workspaceState: VisualAidWorkspaceState) => {
    const next = workspaceStateSnapshot(workspaceState);

    if (next !== lastSeen) {
      lastSeen = next;
      onWorkspaceState(workspaceState);
    }
  };

  const stopListening = await subscribeWorkspaceState((workspaceState) => {
    try {
      handleWorkspaceState(workspaceState);
    } catch (error) {
      onError(error);
    }
  });

  try {
    lastSeen = await syncWorkspaceState(
      lastSeen,
      invokeWorkspaceState,
      handleWorkspaceState,
    );
  } catch (error) {
    stopListening();
    throw error;
  }

  return () => {
    stopListening();
  };
};
