import {
  isTauriEnvironment,
  startSessionBridge,
  type VisualAidPayload,
  type VisualAidWorkspaceState,
} from "./bridge";
import {
  applyLocalClearToWorkspaceState,
  applyLocalShowToWorkspaceState,
  createInitialState,
  newestItemIndex,
  resolveSelectedIndex,
  resolveSelectedWorkspaceId,
  sessionForWorkspaceState,
  statusForSession,
  statusForWorkspaceState,
  type VisualAidState,
} from "./view-model";
import { renderInto } from "./render";

type BootstrapOptions = {
  bootstrapPayload?: VisualAidPayload;
  isTauriEnvironment?: () => boolean;
  now?: () => string;
  startSessionBridge?: (
    onWorkspaceState: (workspaceState: VisualAidWorkspaceState) => void,
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

type AppTheme = "dark" | "light";

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

const syncAppTheme = (target: HTMLElement) => {
  const mediaQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
  const applyTheme = (theme: AppTheme) => {
    target.dataset.theme = theme;
    document.documentElement.dataset.theme = theme;
    if (document.body) {
      document.body.dataset.theme = theme;
    }
    document.documentElement.style.colorScheme = theme;
  };
  const syncTheme = () => {
    applyTheme(mediaQuery ? (mediaQuery.matches ? "dark" : "light") : "dark");
  };

  syncTheme();

  if (!mediaQuery) {
    return () => {
      delete target.dataset.theme;
      delete document.documentElement.dataset.theme;
      if (document.body) {
        delete document.body.dataset.theme;
      }
      document.documentElement.style.removeProperty("color-scheme");
    };
  }

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", syncTheme);

    return () => {
      mediaQuery.removeEventListener("change", syncTheme);
      delete target.dataset.theme;
      delete document.documentElement.dataset.theme;
      if (document.body) {
        delete document.body.dataset.theme;
      }
      document.documentElement.style.removeProperty("color-scheme");
    };
  }

  mediaQuery.addListener(syncTheme);

  return () => {
    mediaQuery.removeListener(syncTheme);
    delete target.dataset.theme;
    delete document.documentElement.dataset.theme;
    if (document.body) {
      delete document.body.dataset.theme;
    }
    document.documentElement.style.removeProperty("color-scheme");
  };
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
  const connectSessionBridge =
    options?.startSessionBridge ?? startSessionBridge;
  const useTauriBridge = detectTauri();
  const state: VisualAidState = createInitialState(
    useTauriBridge,
    options?.bootstrapPayload ?? window.__VISUAL_AID_BOOTSTRAP__,
  );

  const setWorkspaceState = (workspaceState: VisualAidWorkspaceState) => {
    state.workspaceState = workspaceState;
    state.selectedWorkspaceId = resolveSelectedWorkspaceId(
      workspaceState,
      workspaceState.activeWorkspaceId,
    );
    const session = sessionForWorkspaceState(
      workspaceState,
      state.selectedWorkspaceId,
    );
    state.session = session;
    state.status = statusForWorkspaceState(
      workspaceState,
      state.selectedWorkspaceId,
    );
    state.selectedIndex = newestItemIndex(session);
    state.historyOpen = false;
    renderInto(target, state);
  };

  const show = (payload: VisualAidPayload) => {
    setWorkspaceState(
      applyLocalShowToWorkspaceState(
        state.workspaceState ?? { activeWorkspaceId: null, workspaces: [] },
        state.selectedWorkspaceId,
        payload,
        now(),
      ),
    );
  };

  const clear = () => {
    setWorkspaceState(
      applyLocalClearToWorkspaceState(
        state.workspaceState ?? { activeWorkspaceId: null, workspaces: [] },
        state.selectedWorkspaceId,
        now(),
      ),
    );
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
    state.historyOpen = false;
    renderInto(target, state);
  };

  const onWorkspaceTabClick = (event: Event) => {
    if (!(event.target instanceof Element) || !state.workspaceState) {
      return;
    }

    const button = event.target.closest<HTMLButtonElement>(
      ".workspace-tab[data-workspace-id]",
    );

    if (!button || !target.contains(button)) {
      return;
    }

    const workspaceId = button.dataset.workspaceId;

    if (!workspaceId) {
      return;
    }

    state.selectedWorkspaceId = resolveSelectedWorkspaceId(
      state.workspaceState,
      workspaceId,
    );
    state.session = sessionForWorkspaceState(
      state.workspaceState,
      state.selectedWorkspaceId,
    );
    state.status = statusForSession(state.session);
    state.selectedIndex = newestItemIndex(state.session);
    state.historyOpen = false;
    renderInto(target, state);
  };

  const onHistoryToggleClick = (event: Event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const toggle = event.target.closest<HTMLButtonElement>(
      "[data-history-toggle]",
    );

    if (!toggle || !target.contains(toggle)) {
      return;
    }

    state.historyOpen = !state.historyOpen;
    renderInto(target, state);
  };

  const onHistoryDismissClick = (event: Event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const dismiss = event.target.closest<HTMLButtonElement>(
      "[data-history-dismiss]",
    );

    if (!dismiss || !target.contains(dismiss) || !state.historyOpen) {
      return;
    }

    state.historyOpen = false;
    renderInto(target, state);
  };

  window.addEventListener("visual-aid:show", onShowEvent);
  window.addEventListener("visual-aid:clear", onClearEvent);
  target.addEventListener("click", onHistoryClick);
  target.addEventListener("click", onWorkspaceTabClick);
  target.addEventListener("click", onHistoryToggleClick);
  target.addEventListener("click", onHistoryDismissClick);
  const stopThemeSync = syncAppTheme(target);

  renderInto(target, state);

  let stopBridge = () => {};

  if (useTauriBridge) {
    stopBridge = await connectSessionBridge((workspaceState) => {
      setWorkspaceState(workspaceState);
    });
  }

  return () => {
    stopBridge();
    stopThemeSync();
    window.removeEventListener("visual-aid:show", onShowEvent);
    window.removeEventListener("visual-aid:clear", onClearEvent);
    target.removeEventListener("click", onHistoryClick);
    target.removeEventListener("click", onWorkspaceTabClick);
    target.removeEventListener("click", onHistoryToggleClick);
    target.removeEventListener("click", onHistoryDismissClick);
    delete window.__VISUAL_AID__;
  };
};
