import { describe, expect, it } from "vitest";

import {
  createInitialState,
  statusForSession,
} from "../../src/view-model";

describe("Renderer state spec", () => {
  it("VAB-STATUS-001 show status reflects the current payload format", () => {
    const session = {
      openedAt: null,
      lastAction: "show" as const,
      updatedAt: "2026-03-13T16:10:00.000Z",
      items: [
        {
          version: 1 as const,
          format: "markdown" as const,
          content: "# Example",
        },
      ],
    };

    expect(statusForSession(session)).toBe("Received Markdown payload");
  });

  it("VAB-BOOT-001 non-Tauri startup uses a sample session", () => {
    const state = createInitialState(false);

    expect(state.session.items).toHaveLength(1);
    expect(state.status).toBe("Renderer shell ready");
  });
});
