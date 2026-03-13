import {
  isTauriEnvironment,
  startSessionPolling,
  type VisualAidPayload,
  type VisualAidSession,
} from "./bridge";
import {
  applyLocalClear,
  applyLocalShow,
  createInitialState,
  statusForSession,
  type VisualAidState,
} from "./view-model";
import { renderInto } from "./render";

declare global {
  interface Window {
    __VISUAL_AID_BOOTSTRAP__?: VisualAidPayload;
    __VISUAL_AID__?: {
      show: (payload: VisualAidPayload) => void;
      clear: () => void;
    };
  }
}

const isPayload = (value: unknown): value is VisualAidPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    payload.version === 1 &&
    typeof payload.format === "string" &&
    typeof payload.content === "string"
  );
};

export const bootstrapApp = async (target: Element | null) => {
  if (!(target instanceof HTMLElement)) {
    throw new Error("Expected #app root element to exist.");
  }

  const useTauriBridge = isTauriEnvironment();
  const state: VisualAidState = createInitialState(
    useTauriBridge,
    window.__VISUAL_AID_BOOTSTRAP__,
  );

  const setSession = (session: VisualAidSession) => {
    state.session = session;
    state.status = statusForSession(session);
    renderInto(target, state);
  };

  const show = (payload: VisualAidPayload) => {
    setSession(
      applyLocalShow(state.session, payload, new Date().toISOString()),
    );
  };

  const clear = () => {
    setSession(applyLocalClear(state.session, new Date().toISOString()));
  };

  window.__VISUAL_AID__ = { show, clear };

  window.addEventListener("visual-aid:show", (event) => {
    if (!(event instanceof CustomEvent) || !isPayload(event.detail)) {
      return;
    }

    show(event.detail);
  });

  window.addEventListener("visual-aid:clear", () => {
    clear();
  });

  renderInto(target, state);

  if (useTauriBridge) {
    await startSessionPolling((session) => {
      setSession(session);
    });
  }
};
