// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import type { VisualAidSession } from "../../src/bridge";
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

afterEach(() => {
  document.body.innerHTML = "";
  delete window.__VISUAL_AID__;
  delete window.__VISUAL_AID_BOOTSTRAP__;
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
    expect(document.querySelector(".payload-pre code")?.textContent).toContain(
      "# Event Content",
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
    expect(document.querySelector(".payload-pre code")?.textContent).toContain(
      "# Stable",
    );

    cleanup();
  });

  it("VUI-EVENT-003 clear events reset the UI to the empty state", async () => {
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

    expect(document.querySelector(".panel--viewer h2")?.textContent).toBe(
      "Waiting For Payloads",
    );
    expect(document.body.textContent).toContain("No payload has been received yet.");

    cleanup();
  });

  it("VUI-POLL-001 polling updates replace the DOM in Tauri mode", async () => {
    const polledSession: VisualAidSession = {
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
    };
    const stopPolling = vi.fn();

    const cleanup = await bootstrapApp(setupRoot(), {
      isTauriEnvironment: () => true,
      startSessionPolling: async (onSession) => {
        onSession(polledSession);
        return stopPolling;
      },
    });

    expect(document.querySelector(".panel--viewer h2")?.textContent).toBe(
      "Polled Payload",
    );
    expect(document.querySelector(".status-card strong")?.textContent).toBe(
      "Received HTML payload",
    );
    expect(document.querySelector(".payload-html em")?.textContent).toBe(
      "Polled",
    );

    cleanup();

    expect(stopPolling).toHaveBeenCalledTimes(1);
  });
});
