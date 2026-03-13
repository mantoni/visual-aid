// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { emptySession } from "../../src/bridge";
import { renderAppHtml } from "../../src/render";
import { createInitialState } from "../../src/view-model";

const renderDocument = (html: string) => {
  document.body.innerHTML = `<div id="app">${html}</div>`;
  return document.body;
};

describe("Renderer output spec", () => {
  it("VAR-EMPTY-001 empty sessions show waiting and empty states", () => {
    const html = renderAppHtml({
      session: emptySession(),
      status: "Cleared",
    });
    const body = renderDocument(html);

    expect(body.querySelector(".panel--viewer h2")?.textContent).toBe(
      "Waiting For Payloads",
    );
    expect(body.textContent).toContain("No payload has been received yet.");
    expect(body.textContent).toContain("History is empty.");
  });

  it("VAR-MARKDOWN-001 markdown payloads render in a preformatted block", () => {
    const state = createInitialState(false, {
      version: 1,
      format: "markdown",
      title: "Markdown Example",
      content: "# Heading",
    });
    const body = renderDocument(renderAppHtml(state));

    expect(body.querySelector(".payload-pre code")?.textContent).toContain(
      "# Heading",
    );
    expect(body.querySelector(".format-chip")?.textContent).toBe("Markdown");
  });

  it("VAR-HTML-001 HTML payloads render as HTML content", () => {
    const state = createInitialState(false, {
      version: 1,
      format: "html",
      title: "HTML Example",
      content: "<article><strong>Rendered</strong> HTML</article>",
    });
    const body = renderDocument(renderAppHtml(state));

    expect(body.querySelector(".payload-html article strong")?.textContent).toBe(
      "Rendered",
    );
    expect(body.querySelector(".payload-pre")).toBeNull();
  });

  it("VAR-HISTORY-001 history is reverse chronological with the newest item active", () => {
    const html = renderAppHtml({
      session: {
        openedAt: null,
        lastAction: "show",
        updatedAt: "2026-03-13T17:20:00.000Z",
        items: [
          {
            version: 1,
            format: "markdown",
            title: "First",
            content: "# First",
          },
          {
            version: 1,
            format: "diff",
            title: "Second",
            content: "--- a\n+++ b",
          },
        ],
      },
      status: "Received Unified Diff payload",
    });
    const body = renderDocument(html);
    const items = body.querySelectorAll(".history-item");

    expect(items[0]?.textContent).toContain("Second");
    expect(items[0]?.classList.contains("history-item--active")).toBe(true);
    expect(items[1]?.textContent).toContain("First");
  });
});
