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

const replacementPayload: VisualAidPayload = {
  version: 1,
  id: "plan",
  format: "html",
  content: "<article>Updated</article>",
  mode: "append",
};

const wireframePayload: VisualAidPayload = {
  version: 1,
  format: "html",
  content: "<main><section>Wireframe</section></main>",
  presentation: "wireframe",
  mode: "replace",
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

  it("VAS-SHOW-003 append mode updates an existing item when the payload id matches", () => {
    const initial = applyShow(
      emptySession(),
      {
        version: 1,
        id: "plan",
        format: "markdown",
        content: "# Draft",
        mode: "append",
      },
      "2026-03-13T16:03:00.000Z",
    );

    const next = applyShow(initial, replacementPayload, "2026-03-13T16:04:00.000Z");

    expect(next.items).toHaveLength(1);
    expect(next.items[0]?.id).toBe("plan");
    expect(next.items[0]?.format).toBe("html");
    expect(next.items.at(-1)?.content).toBe("<article>Updated</article>");
  });

  it("VAS-SHOW-004 html payloads keep explicit presentation hints", () => {
    const next = applyShow(
      emptySession(),
      wireframePayload,
      "2026-03-13T16:04:30.000Z",
    );

    expect(next.items).toHaveLength(1);
    expect(next.items[0]?.format).toBe("html");
    expect(next.items[0]?.presentation).toBe("wireframe");
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
