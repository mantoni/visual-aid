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

type BootstrapOptions = {
  bootstrapPayload?: VisualAidPayload;
  isTauriEnvironment?: () => boolean;
  now?: () => string;
  startSessionPolling?: (
    onSession: (session: VisualAidSession) => void,
  ) => Promise<() => void> | (() => void);
};

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

export const bootstrapApp = async (
  target: Element | null,
  options?: BootstrapOptions,
) => {
  if (!(target instanceof HTMLElement)) {
    throw new Error("Expected #app root element to exist.");
  }

  const detectTauri = options?.isTauriEnvironment ?? isTauriEnvironment;
  const now = options?.now ?? (() => new Date().toISOString());
  const pollSession = options?.startSessionPolling ?? startSessionPolling;
  const useTauriBridge = detectTauri();
  const state: VisualAidState = createInitialState(
    useTauriBridge,
    options?.bootstrapPayload ?? window.__VISUAL_AID_BOOTSTRAP__,
  );

  const setSession = (session: VisualAidSession) => {
    state.session = session;
    state.status = statusForSession(session);
    renderInto(target, state);
  };

  const show = (payload: VisualAidPayload) => {
    setSession(applyLocalShow(state.session, payload, now()));
  };

  const clear = () => {
    setSession(applyLocalClear(state.session, now()));
  };

  window.__VISUAL_AID__ = { show, clear };

  const onShowEvent = (event: Event) => {
    if (!(event instanceof CustomEvent) || !isPayload(event.detail)) {
      return;
    }

    show(event.detail);
  };

  const onClearEvent = () => {
    clear();
  };

  window.addEventListener("visual-aid:show", onShowEvent);
  window.addEventListener("visual-aid:clear", onClearEvent);

  renderInto(target, state);

  let stopPolling = () => {};

  if (useTauriBridge) {
    stopPolling = await pollSession((session) => {
      setSession(session);
    });
  }

  return () => {
    stopPolling();
    window.removeEventListener("visual-aid:show", onShowEvent);
    window.removeEventListener("visual-aid:clear", onClearEvent);
    delete window.__VISUAL_AID__;
  };
};
