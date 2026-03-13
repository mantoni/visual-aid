import { invoke } from "@tauri-apps/api/core";

type VisualAidFormat = "markdown" | "diff" | "mermaid" | "excalidraw" | "html";
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

const sessionSnapshot = (session: VisualAidSession) => JSON.stringify(session);

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

export const startSessionPolling = async (
  onSession: (session: VisualAidSession) => void,
  options?: {
    enabled?: boolean;
    intervalMs?: number;
    invokeSession?: () => Promise<VisualAidSession>;
    onError?: (error: unknown) => void;
  },
) => {
  const enabled = options?.enabled ?? isTauriEnvironment();

  if (!enabled) {
    return () => {};
  }

  let lastSeen = "";
  const invokeSession =
    options?.invokeSession ??
    (() => invoke<VisualAidSession>("read_session_state"));
  const onError =
    options?.onError ??
    ((error: unknown) => {
      console.error("Failed to sync visual-aid session:", error);
    });
  const intervalMs = options?.intervalMs ?? 1000;

  const sync = async () => {
    lastSeen = await syncSession(lastSeen, invokeSession, onSession);
  };

  await sync();

  const timer = globalThis.setInterval(() => {
    void sync().catch(onError);
  }, intervalMs);

  return () => {
    globalThis.clearInterval(timer);
  };
};
