import { afterEach, describe, expect, it, vi } from "vitest";

import {
  emptySession,
  startSessionBridge,
  syncWorkspaceState,
  type VisualAidWorkspaceState,
  workspaceStateSnapshot,
} from "../../src/bridge";

const workspaceState = (content: string): VisualAidWorkspaceState => ({
  activeWorkspaceId: "/tmp/example",
  workspaces: [
    {
      id: "/tmp/example",
      cwd: "/tmp/example",
      label: "example",
      sessionPath: "/tmp/example/.visual-aid/session.json",
      session: {
        ...emptySession(),
        lastAction: "show",
        items: [
          {
            version: 1,
            format: "markdown",
            content,
          },
        ],
      },
    },
  ],
});

describe("Desktop bridge spec", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("VAB-BRIDGE-001 bridge emits when the session changes", async () => {
    const snapshot = workspaceState("# Example");
    const onWorkspaceState = vi.fn();

    const next = await syncWorkspaceState(
      "",
      async () => snapshot,
      onWorkspaceState,
    );

    expect(onWorkspaceState).toHaveBeenCalledWith(snapshot);
    expect(next).not.toBe("");
  });

  it("VAB-BRIDGE-002 bridge suppresses identical snapshots", async () => {
    const snapshot = workspaceState("# Example");
    const onWorkspaceState = vi.fn();
    const stopListening = vi.fn();
    let deliver: ((workspaceState: VisualAidWorkspaceState) => void) | null = null;

    const stop = await startSessionBridge(onWorkspaceState, {
      enabled: true,
      invokeWorkspaceState: vi.fn().mockResolvedValue(snapshot),
      subscribeWorkspaceState: (handleWorkspaceState) => {
        deliver = handleWorkspaceState;
        return stopListening;
      },
    });

    expect(onWorkspaceState).toHaveBeenCalledTimes(1);
    const deliverUpdate =
      deliver as ((workspaceState: VisualAidWorkspaceState) => void) | null;
    if (deliverUpdate) {
      deliverUpdate(snapshot);
    }

    expect(onWorkspaceState).toHaveBeenCalledTimes(1);

    stop();
    expect(stopListening).toHaveBeenCalledTimes(1);
  });

  it("VAB-BRIDGE-003 bridge treats reordered metadata keys as the same snapshot", async () => {
    const firstWorkspaceState: VisualAidWorkspaceState = {
      activeWorkspaceId: "/tmp/example",
      workspaces: [
        {
          id: "/tmp/example",
          cwd: "/tmp/example",
          label: "example",
          sessionPath: "/tmp/example/.visual-aid/session.json",
          session: {
            ...emptySession(),
            lastAction: "show",
            items: [
              {
                version: 1,
                format: "mermaid",
                content: "graph TD\nA-->B",
                metadata: {
                  source: "manual-test",
                  checkedAt: "2026-03-14T10:22:30+01:00",
                },
              },
            ],
          },
        },
      ],
    };
    const reorderedWorkspaceState: VisualAidWorkspaceState = {
      activeWorkspaceId: "/tmp/example",
      workspaces: [
        {
          id: "/tmp/example",
          cwd: "/tmp/example",
          label: "example",
          sessionPath: "/tmp/example/.visual-aid/session.json",
          session: {
            ...emptySession(),
            lastAction: "show",
            items: [
              {
                version: 1,
                format: "mermaid",
                content: "graph TD\nA-->B",
                metadata: {
                  checkedAt: "2026-03-14T10:22:30+01:00",
                  source: "manual-test",
                },
              },
            ],
          },
        },
      ],
    };
    const onWorkspaceState = vi.fn();
    const stopListening = vi.fn();
    let deliver: ((workspaceState: VisualAidWorkspaceState) => void) | null = null;

    await startSessionBridge(onWorkspaceState, {
      enabled: true,
      invokeWorkspaceState: async () => firstWorkspaceState,
      subscribeWorkspaceState: (handleWorkspaceState) => {
        deliver = handleWorkspaceState;
        return stopListening;
      },
    });

    onWorkspaceState.mockClear();
    const deliverUpdate =
      deliver as ((workspaceState: VisualAidWorkspaceState) => void) | null;
    if (deliverUpdate) {
      deliverUpdate(reorderedWorkspaceState);
    }

    expect(onWorkspaceState).not.toHaveBeenCalled();
    expect(workspaceStateSnapshot(reorderedWorkspaceState)).toBe(
      workspaceStateSnapshot(firstWorkspaceState),
    );
    expect(stopListening).not.toHaveBeenCalled();
  });
});
