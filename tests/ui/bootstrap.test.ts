// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import type { VisualAidWorkspaceState } from "../../src/bridge";
import { bootstrapApp } from "../../src/ui";

const setupRoot = () => {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.querySelector("#app");

  if (!(root instanceof HTMLElement)) {
    throw new Error("Expected #app root");
  }

  return root;
};

const eventPayload = {
  version: 1 as const,
  format: "markdown" as const,
  title: "Event Payload",
  content: "# Event Content",
};

const installMatchMedia = (initialMatches: boolean) => {
  let matches = initialMatches;
  const listeners = new Set<EventListenerOrEventListenerObject>();
  let mediaQuery: MediaQueryList;
  const notifyListener = (
    listener: EventListenerOrEventListenerObject,
    event: MediaQueryListEvent,
  ) => {
    if (typeof listener === "function") {
      listener.call(mediaQuery, event);
      return;
    }

    listener.handleEvent(event);
  };

  mediaQuery = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject | null) => {
      if (listener) {
        listeners.add(listener);
      }
    },
    removeEventListener: (
      _type: string,
      listener: EventListenerOrEventListenerObject | null,
    ) => {
      if (listener) {
        listeners.delete(listener);
      }
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener as EventListener);
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener as EventListener);
    },
    dispatchEvent: (event: Event) => {
      listeners.forEach((listener) =>
        notifyListener(listener, event as MediaQueryListEvent),
      );
      return true;
    },
  } as MediaQueryList;

  vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));

  return {
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      const event = {
        matches,
        media: mediaQuery.media,
      } as MediaQueryListEvent;
      listeners.forEach((listener) => notifyListener(listener, event));
    },
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  delete window.__VISUAL_AID__;
  delete window.__VISUAL_AID_BOOTSTRAP__;
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty("color-scheme");
});

describe("Interactive UI spec", () => {
  it("VUI-EVENT-001 custom show events update the current payload view", async () => {
    const cleanup = await bootstrapApp(setupRoot(), {
      isTauriEnvironment: () => false,
      bootstrapPayload: {
        version: 1,
        format: "markdown",
        title: "Initial Payload",
        content: "# Initial",
      },
      now: () => "2026-03-13T17:30:00.000Z",
    });

    window.dispatchEvent(
      new CustomEvent("visual-aid:show", {
        detail: eventPayload,
      }),
    );

    expect(document.querySelector(".panel--viewer h2")?.textContent).toBe(
      "Event Payload",
    );
    expect(document.querySelector(".payload-markdown h1")?.textContent).toBe(
      "Event Content",
    );

    cleanup();
  });

  it("VUI-EVENT-002 invalid custom show payloads are ignored", async () => {
    const cleanup = await bootstrapApp(setupRoot(), {
      isTauriEnvironment: () => false,
      bootstrapPayload: {
        version: 1,
        format: "markdown",
        title: "Stable Payload",
        content: "# Stable",
      },
    });

    window.dispatchEvent(
      new CustomEvent("visual-aid:show", {
        detail: {
          version: 99,
          format: "unsupported",
        },
      }),
    );

    expect(document.querySelector(".panel--viewer h2")?.textContent).toBe(
      "Stable Payload",
    );
    expect(document.querySelector(".payload-markdown h1")?.textContent).toBe(
      "Stable",
    );

    cleanup();
  });

  it("VUI-EVENT-003 clear events reset the UI to the splash state", async () => {
    const cleanup = await bootstrapApp(setupRoot(), {
      isTauriEnvironment: () => false,
      bootstrapPayload: {
        version: 1,
        format: "markdown",
        title: "Clearable Payload",
        content: "# Clearable",
      },
      now: () => "2026-03-13T17:31:00.000Z",
    });

    window.dispatchEvent(new Event("visual-aid:clear"));

    expect(document.querySelector(".splash h1")?.textContent).toBe("Visual AId");
    expect(document.querySelector(".panel--viewer")).toBeNull();
    expect(document.body.textContent).toContain(
      "Waiting for the first payload in this workspace.",
    );

    cleanup();
  });

  it("VUI-HISTORY-001 clicking a history item updates the current payload view", async () => {
    const cleanup = await bootstrapApp(setupRoot(), {
      isTauriEnvironment: () => false,
      bootstrapPayload: {
        version: 1,
        format: "markdown",
        title: "First Payload",
        content: "# First",
      },
      now: () => "2026-03-13T17:31:00.000Z",
    });

    window.dispatchEvent(
      new CustomEvent("visual-aid:show", {
        detail: {
          version: 1,
          format: "html",
          title: "Second Payload",
          content: "<section>Second</section>",
          mode: "append",
        },
      }),
    );

    const historyItems = document.querySelectorAll<HTMLButtonElement>(".history-item");
    historyItems[1]?.click();

    expect(document.querySelector(".panel--viewer h2")?.textContent).toBe(
      "First Payload",
    );
    expect(document.querySelectorAll(".history-item")[1]?.classList.contains("history-item--active")).toBe(
      true,
    );
    expect(document.querySelector(".payload-markdown h1")?.textContent).toBe(
      "First",
    );

    cleanup();
  });

  it("VUI-BRIDGE-001 host bridge updates replace the DOM in Tauri mode", async () => {
    const polledSession: VisualAidWorkspaceState = {
      activeWorkspaceId: "/tmp/polled",
      workspaces: [
        {
          id: "/tmp/polled",
          cwd: "/tmp/polled",
          label: "polled",
          sessionPath: "/tmp/polled/.visual-aid/session.json",
          session: {
            openedAt: "2026-03-13T17:32:00.000Z",
            lastAction: "show",
            updatedAt: "2026-03-13T17:32:01.000Z",
            items: [
              {
                version: 1,
                format: "html",
                title: "Polled Payload",
                content: "<section><em>Polled</em> HTML</section>",
              },
            ],
          },
        },
      ],
    };
    const stopPolling = vi.fn();

    const cleanup = await bootstrapApp(setupRoot(), {
      isTauriEnvironment: () => true,
      startSessionBridge: async (onSession) => {
        onSession(polledSession);
        return stopPolling;
      },
    });

    expect(document.querySelector(".panel--viewer h2")?.textContent).toBe(
      "Polled Payload",
    );
    expect(document.querySelector(".app-status strong")?.textContent).toBe(
      "Received HTML payload",
    );
    expect(
      document
        .querySelector<HTMLIFrameElement>(".payload-html__frame")
        ?.getAttribute("srcdoc"),
    ).toContain("<section><em>Polled</em> HTML</section>");

    cleanup();

    expect(stopPolling).toHaveBeenCalledTimes(1);
  });

  it("VWT-TABS-002 switching tabs swaps the visible workspace history", async () => {
    const cleanup = await bootstrapApp(setupRoot(), {
      isTauriEnvironment: () => true,
      startSessionBridge: async (onWorkspaceState) => {
        onWorkspaceState({
          activeWorkspaceId: "/tmp/project-one",
          workspaces: [
            {
              id: "/tmp/project-one",
              cwd: "/tmp/project-one",
              label: "project-one",
              sessionPath: "/tmp/project-one/.visual-aid/session.json",
              session: {
                openedAt: null,
                lastAction: "show",
                updatedAt: "2026-03-15T09:25:00.000Z",
                items: [
                  {
                    version: 1,
                    format: "markdown",
                    title: "Workspace One",
                    content: "# One",
                  },
                ],
              },
            },
            {
              id: "/tmp/project-two",
              cwd: "/tmp/project-two",
              label: "project-two",
              sessionPath: "/tmp/project-two/.visual-aid/session.json",
              session: {
                openedAt: null,
                lastAction: "show",
                updatedAt: "2026-03-15T09:26:00.000Z",
                items: [
                  {
                    version: 1,
                    format: "html",
                    title: "Workspace Two",
                    content: "<section>Two</section>",
                  },
                ],
              },
            },
          ],
        });

        return () => {};
      },
    });

    const workspaceTabs = document.querySelectorAll<HTMLButtonElement>(".workspace-tab");
    workspaceTabs[1]?.click();

    expect(document.querySelector(".panel--viewer h2")?.textContent).toBe(
      "Workspace Two",
    );
    expect(document.querySelectorAll(".workspace-tab")[1]?.classList.contains("workspace-tab--active")).toBe(
      true,
    );
    expect(document.querySelector(".payload-html__frame")).not.toBeNull();

    cleanup();
  });

  it("VUI-THEME-001 bootstrap follows preferred color scheme changes", async () => {
    const matchMedia = installMatchMedia(true);
    const cleanup = await bootstrapApp(setupRoot(), {
      isTauriEnvironment: () => false,
    });

    expect(document.querySelector("#app")?.getAttribute("data-theme")).toBe("dark");

    matchMedia.setMatches(false);

    expect(document.querySelector("#app")?.getAttribute("data-theme")).toBe("light");

    cleanup();
  });

  it("VWT-BRIDGE-001 bridge updates can add and activate a new workspace", async () => {
    const bridge = {
      deliver: null as ((workspaceState: VisualAidWorkspaceState) => void) | null,
    };

    const cleanup = await bootstrapApp(setupRoot(), {
      isTauriEnvironment: () => true,
      startSessionBridge: async (onWorkspaceState) => {
        bridge.deliver = onWorkspaceState;
        onWorkspaceState({
          activeWorkspaceId: "/tmp/project-one",
          workspaces: [
            {
              id: "/tmp/project-one",
              cwd: "/tmp/project-one",
              label: "project-one",
              sessionPath: "/tmp/project-one/.visual-aid/session.json",
              session: {
                openedAt: null,
                lastAction: "show",
                updatedAt: "2026-03-15T09:27:00.000Z",
                items: [
                  {
                    version: 1,
                    format: "markdown",
                    title: "Workspace One",
                    content: "# One",
                  },
                ],
              },
            },
          ],
        });

        return () => {};
      },
    });

    const deliverWorkspaceState = bridge.deliver;

    if (!deliverWorkspaceState) {
      throw new Error("Expected bridge update handler");
    }

    deliverWorkspaceState({
      activeWorkspaceId: "/tmp/project-two",
      workspaces: [
        {
          id: "/tmp/project-one",
          cwd: "/tmp/project-one",
          label: "project-one",
          sessionPath: "/tmp/project-one/.visual-aid/session.json",
          session: {
            openedAt: null,
            lastAction: "show",
            updatedAt: "2026-03-15T09:27:00.000Z",
            items: [
              {
                version: 1,
                format: "markdown",
                title: "Workspace One",
                content: "# One",
              },
            ],
          },
        },
        {
          id: "/tmp/project-two",
          cwd: "/tmp/project-two",
          label: "project-two",
          sessionPath: "/tmp/project-two/.visual-aid/session.json",
          session: {
            openedAt: null,
            lastAction: "show",
            updatedAt: "2026-03-15T09:28:00.000Z",
            items: [
              {
                version: 1,
                format: "html",
                title: "Workspace Two",
                content: "<section>Two</section>",
              },
            ],
          },
        },
      ],
    });

    expect(document.querySelectorAll(".workspace-tab")).toHaveLength(2);
    expect(document.querySelector(".panel--viewer h2")?.textContent).toBe(
      "Workspace Two",
    );
    expect(document.querySelectorAll(".workspace-tab")[1]?.classList.contains("workspace-tab--active")).toBe(
      true,
    );

    cleanup();
  });
});
