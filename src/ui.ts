import {
  isTauriEnvironment,
  startSessionBridge,
  type VisualAidPayload,
  type VisualAidSession,
} from "./bridge";
import {
  applyLocalClear,
  applyLocalShow,
  createInitialState,
  newestItemIndex,
  resolveSelectedIndex,
  statusForSession,
  type VisualAidState,
} from "./view-model";
import { renderInto } from "./render";

type BootstrapOptions = {
  bootstrapPayload?: VisualAidPayload;
  isTauriEnvironment?: () => boolean;
  now?: () => string;
  startSessionBridge?: (
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
  const connectSessionBridge = options?.startSessionBridge ?? startSessionBridge;
  const useTauriBridge = detectTauri();
  const state: VisualAidState = createInitialState(
    useTauriBridge,
    options?.bootstrapPayload ?? window.__VISUAL_AID_BOOTSTRAP__,
  );

  const setSession = (session: VisualAidSession) => {
    state.session = session;
    state.status = statusForSession(session);
    state.selectedIndex = newestItemIndex(session);
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

  const onHistoryClick = (event: Event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest<HTMLButtonElement>(
      ".history-item[data-history-index]",
    );

    if (!button || !target.contains(button)) {
      return;
    }

    const index = Number(button.dataset.historyIndex);

    if (!Number.isInteger(index)) {
      return;
    }

    state.selectedIndex = resolveSelectedIndex(state.session, index);
    renderInto(target, state);
  };

  window.addEventListener("visual-aid:show", onShowEvent);
  window.addEventListener("visual-aid:clear", onClearEvent);
  target.addEventListener("click", onHistoryClick);

  renderInto(target, state);

  let stopBridge = () => {};

  if (useTauriBridge) {
    stopBridge = await connectSessionBridge((session) => {
      setSession(session);
    });
  }

  return () => {
    stopBridge();
    window.removeEventListener("visual-aid:show", onShowEvent);
    window.removeEventListener("visual-aid:clear", onClearEvent);
    target.removeEventListener("click", onHistoryClick);
    delete window.__VISUAL_AID__;
  };
};
