import { describe, expect, it } from "vitest";

import type { VisualAidPayload } from "../../mcp/payload.js";
import {
  applyClear,
  applyOpen,
  applyShow,
  emptySession,
} from "../../mcp/session.js";

const markdownPayload: VisualAidPayload = {
  version: 1,
  format: "markdown",
  content: "# Example",
  mode: "replace",
};

const diffPayload: VisualAidPayload = {
  version: 1,
  format: "diff",
  content: "--- a/file\n+++ b/file",
  mode: "append",
};

describe("MCP session spec", () => {
  it("VAS-OPEN-001 records open on an empty session", () => {
    const now = "2026-03-13T16:00:00.000Z";

    const next = applyOpen(emptySession(), now);

    expect(next.lastAction).toBe("open");
    expect(next.openedAt).toBe(now);
    expect(next.updatedAt).toBe(now);
  });

  it("VAS-SHOW-001 replace mode resets the active item list", () => {
    const now = "2026-03-13T16:01:00.000Z";

    const next = applyShow(emptySession(), markdownPayload, now);

    expect(next.items).toHaveLength(1);
    expect(next.items[0]?.format).toBe("markdown");
    expect(next.lastAction).toBe("show");
  });

  it("VAS-SHOW-002 append mode keeps prior items", () => {
    const now = "2026-03-13T16:02:00.000Z";
    const initial = applyShow(emptySession(), markdownPayload, now);

    const next = applyShow(initial, diffPayload, "2026-03-13T16:03:00.000Z");

    expect(next.items).toHaveLength(2);
    expect(next.items.at(-1)?.format).toBe("diff");
  });

  it("VAS-CLEAR-001 clear removes all items", () => {
    const populated = applyShow(
      emptySession(),
      markdownPayload,
      "2026-03-13T16:04:00.000Z",
    );

    const next = applyClear(populated, "2026-03-13T16:05:00.000Z");

    expect(next.items).toHaveLength(0);
    expect(next.lastAction).toBe("clear");
  });
});
