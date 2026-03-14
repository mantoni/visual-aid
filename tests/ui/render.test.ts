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
      selectedIndex: null,
    });
    const body = renderDocument(html);

    expect(body.querySelector(".panel--viewer h2")?.textContent).toBe(
      "Waiting For Payloads",
    );
    expect(body.textContent).toContain("No payload has been received yet.");
    expect(body.textContent).toContain("History is empty.");
  });

  it("VAR-MARKDOWN-001 markdown payloads render in the markdown container", () => {
    const state = createInitialState(false, {
      version: 1,
      format: "markdown",
      title: "Markdown Example",
      content: "# Heading",
    });
    const body = renderDocument(renderAppHtml(state));

    expect(body.querySelector(".payload-markdown h1")?.textContent).toBe(
      "Heading",
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
    const frame = body.querySelector<HTMLIFrameElement>(".payload-html__frame");

    expect(frame).not.toBeNull();
    expect(frame?.getAttribute("sandbox")).toBe("");
    expect(frame?.getAttribute("srcdoc")).toContain("<article><strong>Rendered</strong> HTML</article>");
    expect(frame?.getAttribute("srcdoc")).toContain(".payload-html-fragment");
    expect(body.querySelector(".payload-html article")).toBeNull();
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
      selectedIndex: 1,
    });
    const body = renderDocument(html);
    const items = body.querySelectorAll(".history-item");

    expect(items[0]?.textContent).toContain("Second");
    expect(items[0]?.classList.contains("history-item--active")).toBe(true);
    expect(items[1]?.textContent).toContain("First");
  });

  it("VFR-MARKDOWN-001 markdown headings and lists render semantically", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-13T17:40:00.000Z",
          items: [
            {
              version: 1,
              format: "markdown",
              title: "Semantic Markdown",
              content: ["# Heading", "", "- first item", "- second item"].join(
                "\n",
              ),
            },
          ],
        },
        status: "Received Markdown payload",
        selectedIndex: 0,
      }),
    );

    expect(body.querySelector(".payload-markdown h1")?.textContent).toBe(
      "Heading",
    );
    expect(body.querySelectorAll(".payload-markdown li")).toHaveLength(2);
  });

  it("VFR-MARKDOWN-002 markdown tables, blockquotes, links, and fenced code render with richer structure", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-14T10:12:00.000Z",
          items: [
            {
              version: 1,
              format: "markdown",
              title: "Rich Markdown",
              content: [
                "## Status",
                "",
                "> Ready for review with `cargo test` output attached.",
                "",
                "1. Build",
                "2. Verify",
                "",
                "| Step | State |",
                "| --- | --- |",
                "| Render | Done |",
                "",
                "See [docs](https://example.com/docs).",
                "",
                "```ts",
                "export const status = 'ok';",
                "```",
              ].join("\n"),
            },
          ],
        },
        status: "Received Markdown payload",
        selectedIndex: 0,
      }),
    );

    expect(body.querySelector(".payload-markdown blockquote")?.textContent).toContain(
      "Ready for review",
    );
    expect(body.querySelectorAll(".payload-markdown ol li")).toHaveLength(2);
    expect(body.querySelector(".payload-markdown table th")?.textContent).toBe("Step");
    expect(body.querySelector(".payload-markdown a")?.getAttribute("href")).toBe(
      "https://example.com/docs",
    );
    expect(body.querySelector(".payload-markdown a")?.getAttribute("target")).toBe(
      "_blank",
    );
    expect(body.querySelector(".payload-markdown__code-label")?.textContent).toBe(
      "ts",
    );
    expect(body.querySelector(".payload-pre--markdown code")?.textContent).toContain(
      "export const status = 'ok';",
    );
  });

  it("VFR-DIFF-001 diff lines are classified by line type", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-13T17:41:00.000Z",
          items: [
            {
              version: 1,
              format: "diff",
              title: "Diff Example",
              content: [
                "--- a/file.ts",
                "+++ b/file.ts",
                "@@ -1 +1 @@",
                "-old",
                "+new",
              ].join("\n"),
            },
          ],
        },
        status: "Received Unified Diff payload",
        selectedIndex: 0,
      }),
    );

    expect(body.querySelector(".payload-diff__line--remove code")?.textContent).toBe(
      "-old",
    );
    expect(body.querySelector(".payload-diff__line--add code")?.textContent).toBe(
      "+new",
    );
    expect(body.querySelector(".payload-diff__line--hunk code")?.textContent).toBe(
      "@@ -1 +1 @@",
    );
  });

  it("VFR-JSON-001 JSON payloads render a parsed tree and raw preview", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-14T11:04:00.000Z",
          items: [
            {
              version: 1,
              format: "json",
              title: "JSON Example",
              content: JSON.stringify({
                name: "visual-aid",
                steps: ["render", "verify"],
                ready: true,
              }),
            },
          ],
        },
        status: "Received JSON payload",
        selectedIndex: 0,
      }),
    );

    expect(body.querySelector(".payload-json")).not.toBeNull();
    expect(body.textContent).toContain("Parsed JSON");
    expect(body.querySelector(".payload-json__key")?.textContent).toBe("name");
    expect(body.querySelector(".payload-json__value--string")?.textContent).toContain(
      "\"visual-aid\"",
    );
    expect(body.querySelector(".payload-json__raw code")?.textContent).toContain(
      "\"steps\"",
    );
  });

  it("VFR-JSON-002 invalid JSON payloads show a readable fallback", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-14T11:05:00.000Z",
          items: [
            {
              version: 1,
              format: "json",
              title: "Broken JSON",
              content: '{"name": "visual-aid",}',
            },
          ],
        },
        status: "Received JSON payload",
        selectedIndex: 0,
      }),
    );

    expect(body.textContent).toContain("Unparsed JSON");
    expect(body.querySelector(".payload-pre--json code")?.textContent).toContain(
      '{"name": "visual-aid",}',
    );
  });

  it("renderAppHtml includes the Mermaid frame and source disclosure", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-13T17:42:00.000Z",
          items: [
            {
              version: 1,
              format: "mermaid",
              title: "Diagram",
              content: "graph TD\nA[Agent] --> B[Viewer]",
            },
          ],
        },
        status: "Received Mermaid payload",
        selectedIndex: 0,
      }),
    );

    expect(body.querySelector(".payload-mermaid")).not.toBeNull();
    expect(body.querySelector(".payload-mermaid__diagram")).not.toBeNull();
    expect(body.querySelector(".payload-mermaid__source-code")?.textContent).toContain(
      "graph TD",
    );
  });

  it("VFR-EXCALIDRAW-001 excalidraw payloads show parsed summary details", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-13T17:43:00.000Z",
          items: [
            {
              version: 1,
              format: "excalidraw",
              title: "Sketch",
              content: JSON.stringify({
                elements: [{ id: "a" }, { id: "b" }],
                appState: { viewBackgroundColor: "#fff" },
              }),
            },
          ],
        },
        status: "Received Excalidraw payload",
        selectedIndex: 0,
      }),
    );

    expect(body.querySelector(".payload-excalidraw")).not.toBeNull();
    expect(body.textContent).toContain("2 elements");
    expect(body.querySelector(".payload-excalidraw .payload-pre code")?.textContent).toContain(
      "\"elements\"",
    );
  });

  it("VAR-HISTORY-002 the current payload reflects the selected history item", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-13T17:44:00.000Z",
          items: [
            {
              version: 1,
              format: "markdown",
              title: "Older",
              content: "# Older",
            },
            {
              version: 1,
              format: "html",
              title: "Newer",
              content: "<section>Newer</section>",
            },
          ],
        },
        status: "Received HTML payload",
        selectedIndex: 0,
      }),
    );

    expect(body.querySelector(".panel--viewer h2")?.textContent).toBe("Older");
    expect(body.querySelectorAll(".history-item")[1]?.classList.contains("history-item--active")).toBe(
      true,
    );
    expect(body.querySelector(".payload-markdown h1")?.textContent).toBe("Older");
  });

  it("VAR-META-001 metadata renders in a stable key order", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-14T09:50:00.000Z",
          items: [
            {
              version: 1,
              format: "mermaid",
              title: "Metadata Example",
              content: "graph TD\nA-->B",
              metadata: {
                source: "manual-test",
                checkedAt: "2026-03-14T10:22:30+01:00",
              },
            },
          ],
        },
        status: "Received Mermaid payload",
        selectedIndex: 0,
      }),
    );

    expect(body.querySelector(".payload-pre--meta code")?.textContent).toBe(`{
  "checkedAt": "2026-03-14T10:22:30+01:00",
  "source": "manual-test"
}`);
  });
});
