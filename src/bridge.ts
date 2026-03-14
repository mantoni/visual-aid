import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type VisualAidFormat =
  | "markdown"
  | "json"
  | "diff"
  | "mermaid"
  | "excalidraw"
  | "html";
type VisualAidMode = "replace" | "append";

export type VisualAidPayload = {
  version: 1;
  format: VisualAidFormat;
  content: string;
  id?: string;
  title?: string;
  summary?: string;
  mode?: VisualAidMode;
  metadata?: Record<string, unknown>;
};

export type VisualAidSession = {
  openedAt: string | null;
  lastAction: "open" | "show" | "clear";
  updatedAt: string | null;
  items: VisualAidPayload[];
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

export const isTauriEnvironment = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const emptySession = (): VisualAidSession => ({
  openedAt: null,
  lastAction: "clear",
  updatedAt: null,
  items: [],
});

export const syncSession = async (
  lastSeen: string,
  invokeSession: () => Promise<VisualAidSession>,
  onSession: (session: VisualAidSession) => void,
) => {
  const session = await invokeSession();
  const next = sessionSnapshot(session);

  if (next !== lastSeen) {
    onSession(session);
  }

  return next;
};

type SessionBridgeOptions = {
  enabled?: boolean;
  invokeSession?: () => Promise<VisualAidSession>;
  subscribeSession?: (
    onSession: (session: VisualAidSession) => void,
  ) => Promise<() => void> | (() => void);
  onError?: (error: unknown) => void;
};

export const startSessionBridge = async (
  onSession: (session: VisualAidSession) => void,
  options?: SessionBridgeOptions,
) => {
  const enabled = options?.enabled ?? isTauriEnvironment();

  if (!enabled) {
    return () => {};
  }

  let lastSeen = "";
  const invokeSession =
    options?.invokeSession ??
    (() => invoke<VisualAidSession>("read_session_state"));
  const subscribeSession =
    options?.subscribeSession ??
    ((handleSession: (session: VisualAidSession) => void) =>
      listen<VisualAidSession>(SESSION_UPDATED_EVENT, (event) => {
        handleSession(event.payload);
      }));
  const onError =
    options?.onError ??
    ((error: unknown) => {
      console.error("Failed to sync visual-aid session:", error);
    });
  const handleSession = (session: VisualAidSession) => {
    const next = sessionSnapshot(session);

    if (next !== lastSeen) {
      lastSeen = next;
      onSession(session);
    }
  };

  const stopListening = await subscribeSession((session) => {
    try {
      handleSession(session);
    } catch (error) {
      onError(error);
    }
  });

  try {
    lastSeen = await syncSession(lastSeen, invokeSession, handleSession);
  } catch (error) {
    stopListening();
    throw error;
  }

  return () => {
    stopListening();
  };
};
