// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { emptySession } from "../../src/bridge";
import { renderAppHtml, renderInto } from "../../src/render";
import { createInitialState } from "../../src/view-model";

const renderDocument = (html: string) => {
  document.body.innerHTML = `<div id="app">${html}</div>`;
  return document.body;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Renderer output spec", () => {
  it("VAR-EMPTY-001 empty sessions show the branded splash state", () => {
    const html = renderAppHtml({
      session: emptySession(),
      status: "Cleared",
      selectedIndex: null,
    });
    const body = renderDocument(html);

    expect(body.querySelector(".splash h1")?.textContent).toBe("Visual AId");
    expect(body.querySelector(".viewer-surface")).toBeNull();
    expect(body.textContent).toContain(
      "Waiting for the first payload in this workspace.",
    );
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

  it("VAR-CODE-001 source code payloads render in the code container", () => {
    const state = createInitialState(false, {
      version: 1,
      format: "code",
      title: "Code Example",
      content: "export const status = 'ok';",
      language: "typescript",
    });
    const body = renderDocument(renderAppHtml(state));

    expect(body.querySelector(".payload-code")).not.toBeNull();
    expect(body.querySelector(".payload-code__label")?.textContent).toBe(
      "typescript",
    );
    expect(body.querySelector(".format-chip")?.textContent).toBe("Source Code");
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
    expect(frame?.getAttribute("sandbox")).toBe("allow-same-origin");
    expect(frame?.getAttribute("srcdoc")).toContain(
      "<article><strong>Rendered</strong> HTML</article>",
    );
    expect(frame?.getAttribute("srcdoc")).toContain(".payload-html-fragment");
    expect(body.querySelector(".payload-html article")).toBeNull();
    expect(body.querySelector(".payload-pre")).toBeNull();
  });

  it("VAR-HTML-002 HTML payloads size the iframe to the available viewport", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const originalGetComputedStyle = window.getComputedStyle.bind(window);

    renderInto(
      root,
      createInitialState(false, {
        version: 1,
        format: "html",
        title: "Viewport HTML Example",
        content: "<section style='height: 600px;'>Viewport</section>",
      }),
    );

    const container = root.querySelector<HTMLElement>(".payload-html");
    const frame = root.querySelector<HTMLIFrameElement>(".payload-html__frame");
    const toolbar = root.querySelector<HTMLElement>(".document-toolbar");

    expect(root.querySelector(".shell--document-html")).not.toBeNull();
    expect(frame).not.toBeNull();
    expect(container).not.toBeNull();
    expect(toolbar).not.toBeNull();

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1000,
    });

    vi.spyOn(toolbar!, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 0,
      height: 180,
      top: 0,
      right: 0,
      bottom: 180,
      left: 0,
      toJSON: () => ({}),
    });

    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
      if (element === container) {
        return {
          paddingTop: "24px",
          paddingBottom: "28px",
        } as CSSStyleDeclaration;
      }

      return originalGetComputedStyle(element);
    });

    frame?.dispatchEvent(new Event("load"));

    expect(frame?.style.height).toBe("768px");

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1200,
    });

    window.dispatchEvent(new Event("resize"));

    expect(frame?.style.height).toBe("968px");
    expect(container?.classList.contains("payload-html--loading")).toBe(false);
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
      historyOpen: true,
    });
    const body = renderDocument(html);
    const items = body.querySelectorAll(".history-item");

    expect(items[0]?.textContent).toContain("Second");
    expect(items[0]?.classList.contains("history-item--active")).toBe(true);
    expect(items[1]?.textContent).toContain("First");
  });

  it("VAR-LAYOUT-001 payload sessions show a document viewer and compact recents control", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-15T10:00:00.000Z",
          items: [
            {
              version: 1,
              format: "markdown",
              title: "Layout Example",
              content: "# Layout",
            },
          ],
        },
        status: "Received Markdown payload",
        selectedIndex: 0,
      }),
    );

    expect(body.querySelector(".viewer-surface")).not.toBeNull();
    expect(body.querySelector(".history-toggle")).not.toBeNull();
    expect(body.querySelector(".app-status")).toBeNull();
  });

  it("VWT-TABS-001 multiple workspaces render as tabs", () => {
    const body = renderDocument(
      renderAppHtml({
        workspaceState: {
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
                updatedAt: "2026-03-15T09:15:00.000Z",
                items: [
                  {
                    version: 1,
                    format: "markdown",
                    title: "Project One",
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
                updatedAt: "2026-03-15T09:16:00.000Z",
                items: [
                  {
                    version: 1,
                    format: "html",
                    title: "Project Two",
                    content: "<section>Two</section>",
                  },
                ],
              },
            },
          ],
        },
        selectedWorkspaceId: "/tmp/project-two",
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-15T09:16:00.000Z",
          items: [
            {
              version: 1,
              format: "html",
              title: "Project Two",
              content: "<section>Two</section>",
            },
          ],
        },
        status: "Received HTML payload",
        selectedIndex: 0,
      }),
    );

    const tabs = body.querySelectorAll(".workspace-tab");

    expect(tabs).toHaveLength(2);
    expect(tabs[0]?.textContent).toContain("project-one");
    expect(tabs[1]?.classList.contains("workspace-tab--active")).toBe(true);
  });

  it("VWT-TABS-003 workspace tabs expose path tooltips and close controls", () => {
    const body = renderDocument(
      renderAppHtml({
        workspaceState: {
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
                updatedAt: "2026-03-15T09:15:00.000Z",
                items: [
                  {
                    version: 1,
                    format: "markdown",
                    title: "Project One",
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
                updatedAt: "2026-03-15T09:16:00.000Z",
                items: [
                  {
                    version: 1,
                    format: "html",
                    title: "Project Two",
                    content: "<section>Two</section>",
                  },
                ],
              },
            },
          ],
        },
        selectedWorkspaceId: "/tmp/project-two",
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-15T09:16:00.000Z",
          items: [
            {
              version: 1,
              format: "html",
              title: "Project Two",
              content: "<section>Two</section>",
            },
          ],
        },
        status: "Received HTML payload",
        selectedIndex: 0,
      }),
    );

    const tabs = body.querySelectorAll<HTMLButtonElement>(".workspace-tab");
    const closeButtons =
      body.querySelectorAll<HTMLButtonElement>(".workspace-tab__close");
    const tooltips =
      body.querySelectorAll<HTMLSpanElement>(".workspace-tab__tooltip");

    expect(tabs[0]?.hasAttribute("title")).toBe(false);
    expect(tabs[1]?.hasAttribute("title")).toBe(false);
    expect(tooltips[0]?.textContent?.trim()).toBe("/tmp/project-one");
    expect(tooltips[1]?.textContent?.trim()).toBe("/tmp/project-two");
    expect(closeButtons).toHaveLength(2);
    expect(closeButtons[0]?.getAttribute("aria-label")).toBe(
      "Close project-one tab",
    );
  });

  it("VAR-HISTORY-003 recents are hidden until the user opens them", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-15T10:10:00.000Z",
          items: [
            {
              version: 1,
              format: "markdown",
              title: "First",
              content: "# First",
            },
            {
              version: 1,
              format: "code",
              title: "Second",
              content: "const second = true;",
            },
          ],
        },
        status: "Received Source Code payload",
        selectedIndex: 1,
      }),
    );

    expect(
      body.querySelector(".history-toggle")?.getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      body
        .querySelector(".history-overlay")
        ?.classList.contains("history-overlay--open"),
    ).toBe(false);
  });

  it("VAR-LAYOUT-002 the recents sheet is anchored to the sticky toolbar", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-15T10:15:00.000Z",
          items: [
            {
              version: 1,
              format: "markdown",
              title: "First",
              content: "# First",
            },
            {
              version: 1,
              format: "code",
              title: "Second",
              content: "const second = true;",
            },
          ],
        },
        status: "Received Source Code payload",
        selectedIndex: 1,
        historyOpen: true,
      }),
    );

    expect(body.querySelector(".app-frame > .history-overlay")).not.toBeNull();
    expect(body.querySelector(".document-stage .history-sheet")).toBeNull();
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

  it("VFR-MARKDOWN-002 markdown tables, blockquotes, links, and fenced code render with richer structure and syntax highlighting", () => {
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

    expect(
      body.querySelector(".payload-markdown blockquote")?.textContent,
    ).toContain("Ready for review");
    expect(body.querySelectorAll(".payload-markdown ol li")).toHaveLength(2);
    expect(body.querySelector(".payload-markdown table th")?.textContent).toBe(
      "Step",
    );
    expect(
      body.querySelector(".payload-markdown a")?.getAttribute("href"),
    ).toBe("https://example.com/docs");
    expect(
      body.querySelector(".payload-markdown a")?.getAttribute("target"),
    ).toBe("_blank");
    expect(
      body.querySelector(".payload-markdown__code-label")?.textContent,
    ).toBe("ts");
    expect(
      body.querySelector(".payload-pre--markdown code")?.textContent,
    ).toContain("export const status = 'ok';");
    expect(
      body.querySelector(".payload-pre--markdown .hljs-keyword")?.textContent,
    ).toContain("export");
  });

  it("VFR-MARKDOWN-006 markdown raw html snippets render as sanitized html", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-15T13:20:00.000Z",
          items: [
            {
              version: 1,
              format: "markdown",
              title: "Inline HTML",
              content: [
                'Status: <strong>ready</strong> and <span class="va-inline">visible</span>.',
                "",
                '<div class="va-callout"><em>Sanitized block HTML</em></div>',
                "",
                "<script>window.__visualAidScriptRan = true;</script>",
              ].join("\n"),
            },
          ],
        },
        status: "Received Markdown payload",
        selectedIndex: 0,
      }),
    );

    expect(body.querySelector(".payload-markdown strong")?.textContent).toBe(
      "ready",
    );
    expect(
      body.querySelector(".payload-markdown .va-inline")?.textContent,
    ).toBe("visible");
    expect(
      body.querySelector(".payload-markdown .va-callout em")?.textContent,
    ).toBe("Sanitized block HTML");
    expect(body.querySelector(".payload-markdown script")).toBeNull();
  });

  it("VFR-MARKDOWN-003 markdown mermaid fences render embedded mermaid frames", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-15T13:00:00.000Z",
          items: [
            {
              version: 1,
              format: "markdown",
              title: "Embedded Diagram",
              content: [
                "# Diagram",
                "",
                "```mermaid",
                "graph TD",
                "  A[Agent] --> B[Viewer]",
                "```",
              ].join("\n"),
            },
          ],
        },
        status: "Received Markdown payload",
        selectedIndex: 0,
      }),
    );

    expect(
      body.querySelector(".payload-markdown .payload-mermaid--embedded"),
    ).not.toBeNull();
    expect(
      body.querySelector(".payload-markdown .payload-mermaid__diagram"),
    ).not.toBeNull();
    expect(
      body.querySelector(".payload-markdown .payload-mermaid__source-code")
        ?.textContent,
    ).toContain("graph TD");
  });

  it("VFR-MARKDOWN-005 markdown diff fences render embedded diff views", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-15T13:05:00.000Z",
          items: [
            {
              version: 1,
              format: "markdown",
              title: "Embedded Diff",
              content: [
                "# Patch",
                "",
                "```diff",
                "--- a/src/render.ts",
                "+++ b/src/render.ts",
                "@@ -1 +1 @@",
                "-const oldValue = 1;",
                "+const newValue = 2;",
                "```",
              ].join("\n"),
            },
          ],
        },
        status: "Received Markdown payload",
        selectedIndex: 0,
      }),
    );

    expect(
      body.querySelector(".payload-markdown .payload-diff--embedded"),
    ).not.toBeNull();
    expect(
      body.querySelector(".payload-markdown .payload-diff__line--file code")
        ?.textContent,
    ).toBe("--- a/src/render.ts");
    expect(
      body.querySelector(".payload-markdown .payload-diff__line--remove code")
        ?.textContent,
    ).toBe("-const oldValue = 1;");
    expect(
      body.querySelector(".payload-markdown .payload-diff__line--add code")
        ?.textContent,
    ).toBe("+const newValue = 2;");
  });

  it("VFR-CODE-001 source code payloads render with syntax highlighting", () => {
    const body = renderDocument(
      renderAppHtml({
        session: {
          openedAt: null,
          lastAction: "show",
          updatedAt: "2026-03-14T10:30:00.000Z",
          items: [
            {
              version: 1,
              format: "code",
              title: "Renderer",
              content: "export const status = 'ok';",
              language: "typescript",
            },
          ],
        },
        status: "Received Source Code payload",
        selectedIndex: 0,
      }),
    );

    expect(body.querySelector(".payload-code")).not.toBeNull();
    expect(body.querySelector(".payload-code__label")?.textContent).toBe(
      "typescript",
    );
    expect(
      body.querySelector(".payload-code .hljs-keyword")?.textContent,
    ).toContain("export");
    expect(
      body.querySelector(".payload-code .payload-pre--code code")?.textContent,
    ).toContain("export const status = 'ok';");
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

    expect(
      body.querySelector(".payload-diff__line--remove code")?.textContent,
    ).toBe("-old");
    expect(
      body.querySelector(".payload-diff__line--add code")?.textContent,
    ).toBe("+new");
    expect(
      body.querySelector(".payload-diff__line--hunk code")?.textContent,
    ).toBe("@@ -1 +1 @@");
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
    expect(
      body.querySelector(".payload-json__value--string")?.textContent,
    ).toContain('"visual-aid"');
    expect(
      body.querySelector(".payload-json__raw code")?.textContent,
    ).toContain('"steps"');
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
    expect(
      body.querySelector(".payload-pre--json code")?.textContent,
    ).toContain('{"name": "visual-aid",}');
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
    expect(
      body.querySelector(".payload-mermaid__source-code")?.textContent,
    ).toContain("graph TD");
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
        historyOpen: true,
      }),
    );

    expect(body.querySelector(".document-toolbar__title")?.textContent).toBe(
      "Older",
    );
    expect(
      body
        .querySelectorAll(".history-item")[1]
        ?.classList.contains("history-item--active"),
    ).toBe(true);
    expect(body.querySelector(".payload-markdown h1")?.textContent).toBe(
      "Older",
    );
  });
});
