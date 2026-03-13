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

export const startSessionPolling = async (
  onSession: (session: VisualAidSession) => void,
) => {
  if (!isTauriEnvironment()) {
    return () => {};
  }

  let lastSeen = "";

  const sync = async () => {
    const session = await invoke<VisualAidSession>("read_session_state");
    const next = sessionSnapshot(session);

    if (next !== lastSeen) {
      lastSeen = next;
      onSession(session);
    }
  };

  await sync();

  const timer = window.setInterval(() => {
    void sync().catch((error) => {
      console.error("Failed to sync visual-aid session:", error);
    });
  }, 1000);

  return () => {
    window.clearInterval(timer);
  };
};
