import { afterEach, describe, expect, it, vi } from "vitest";

import {
  emptySession,
  sessionSnapshot,
  startSessionPolling,
  syncSession,
} from "../../src/bridge";

describe("Desktop bridge polling spec", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("VAB-POLL-001 polling emits when the session changes", async () => {
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

  it("VAB-POLL-002 polling suppresses identical snapshots", async () => {
    vi.useFakeTimers();

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
    const invokeSession = vi.fn().mockResolvedValue(session);
    const onSession = vi.fn();

    const stop = await startSessionPolling(onSession, {
      enabled: true,
      intervalMs: 25,
      invokeSession,
    });

    expect(onSession).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(50);

    expect(onSession).toHaveBeenCalledTimes(1);

    stop();
  });

  it("VAB-POLL-003 polling treats reordered metadata keys as the same snapshot", async () => {
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

    const next = await syncSession(
      sessionSnapshot(firstSession),
      async () => reorderedSession,
      onSession,
    );

    expect(onSession).not.toHaveBeenCalled();
    expect(next).toBe(sessionSnapshot(firstSession));
  });
});
