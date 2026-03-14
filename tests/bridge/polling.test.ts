import { afterEach, describe, expect, it, vi } from "vitest";

import {
  emptySession,
  sessionSnapshot,
  startSessionBridge,
  type VisualAidSession,
  syncSession,
} from "../../src/bridge";

describe("Desktop bridge spec", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("VAB-BRIDGE-001 bridge emits when the session changes", async () => {
    const session = {
      ...emptySession(),
      lastAction: "show" as const,
      items: [
        {
          version: 1 as const,
          format: "markdown" as const,
          content: "# Example",
        },
      ],
    };
    const onSession = vi.fn();

    const next = await syncSession("", async () => session, onSession);

    expect(onSession).toHaveBeenCalledWith(session);
    expect(next).not.toBe("");
  });

  it("VAB-BRIDGE-002 bridge suppresses identical snapshots", async () => {
    const session = {
      ...emptySession(),
      lastAction: "show" as const,
      items: [
        {
          version: 1 as const,
          format: "markdown" as const,
          content: "# Example",
        },
      ],
    };
    const onSession = vi.fn();
    const stopListening = vi.fn();
    let deliver: ((session: VisualAidSession) => void) | null = null;

    const stop = await startSessionBridge(onSession, {
      enabled: true,
      invokeSession: vi.fn().mockResolvedValue(session),
      subscribeSession: (handleSession) => {
        deliver = handleSession;
        return stopListening;
      },
    });

    expect(onSession).toHaveBeenCalledTimes(1);
    const deliverUpdate = deliver as ((session: VisualAidSession) => void) | null;
    if (deliverUpdate) {
      deliverUpdate(session);
    }

    expect(onSession).toHaveBeenCalledTimes(1);

    stop();
    expect(stopListening).toHaveBeenCalledTimes(1);
  });

  it("VAB-BRIDGE-003 bridge treats reordered metadata keys as the same snapshot", async () => {
    const firstSession = {
      ...emptySession(),
      lastAction: "show" as const,
      items: [
        {
          version: 1 as const,
          format: "mermaid" as const,
          content: "graph TD\nA-->B",
          metadata: {
            source: "manual-test",
            checkedAt: "2026-03-14T10:22:30+01:00",
          },
        },
      ],
    };
    const reorderedSession = {
      ...emptySession(),
      lastAction: "show" as const,
      items: [
        {
          version: 1 as const,
          format: "mermaid" as const,
          content: "graph TD\nA-->B",
          metadata: {
            checkedAt: "2026-03-14T10:22:30+01:00",
            source: "manual-test",
          },
        },
      ],
    };
    const onSession = vi.fn();
    const stopListening = vi.fn();
    let deliver: ((session: VisualAidSession) => void) | null = null;

    await startSessionBridge(onSession, {
      enabled: true,
      invokeSession: async () => firstSession,
      subscribeSession: (handleSession) => {
        deliver = handleSession;
        return stopListening;
      },
    });

    onSession.mockClear();
    const deliverUpdate = deliver as ((session: VisualAidSession) => void) | null;
    if (deliverUpdate) {
      deliverUpdate(reorderedSession);
    }

    expect(onSession).not.toHaveBeenCalled();
    expect(sessionSnapshot(reorderedSession)).toBe(sessionSnapshot(firstSession));
    expect(stopListening).not.toHaveBeenCalled();
  });
});
