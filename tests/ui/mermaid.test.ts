// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { hydrateMermaidPayloads, resetMermaidRendererForTests } from "../../src/mermaid";
import { renderAppHtml } from "../../src/render";

const renderMermaidPayload = (content: string) => {
  document.body.innerHTML = renderAppHtml({
    session: {
      openedAt: null,
      lastAction: "show",
      updatedAt: "2026-03-14T09:30:00.000Z",
      items: [
        {
          version: 1,
          format: "mermaid",
          title: "Diagram",
          content,
        },
      ],
    },
    status: "Received Mermaid payload",
    selectedIndex: 0,
  });
};

const renderMarkdownMermaidPayload = (content: string) => {
  document.body.innerHTML = renderAppHtml({
    session: {
      openedAt: null,
      lastAction: "show",
      updatedAt: "2026-03-15T10:30:00.000Z",
      items: [
        {
          version: 1,
          format: "markdown",
          title: "Embedded Diagram",
          content: ["# Diagram", "", "```mermaid", content, "```"].join("\n"),
        },
      ],
    },
    status: "Received Markdown payload",
    selectedIndex: 0,
  });
};

afterEach(() => {
  document.body.innerHTML = "";
  resetMermaidRendererForTests();
});

describe("Mermaid renderer spec", () => {
  it("VFR-MERMAID-001 mermaid payloads render as diagrams when the renderer succeeds", async () => {
    const initialize = vi.fn();
    const render = vi.fn().mockResolvedValue({
      svg: '<svg viewBox="0 0 10 10"><text>Rendered</text></svg>',
    });

    renderMermaidPayload("graph TD\nA[Agent] --> B[Viewer]");

    await hydrateMermaidPayloads(document.body, {
      loadRenderer: async () => ({
        initialize,
        render,
      }),
    });

    expect(initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
    });
    expect(render).toHaveBeenCalledWith(
      "visual-aid-mermaid-0",
      expect.stringContaining("graph TD\nA[Agent] --> B[Viewer]"),
    );
    expect(document.querySelector(".payload-mermaid__diagram svg")).not.toBeNull();
    expect(document.querySelector(".payload-mermaid__status")?.textContent).toBe(
      "Rendered diagram",
    );
    expect(
      document.querySelector<HTMLDetailsElement>("[data-mermaid-source-panel]")?.open,
    ).toBe(false);
    expect(document.querySelector(".payload-mermaid__source-code")?.textContent).toContain(
      "graph TD",
    );
  });

  it("VFR-MERMAID-002 mermaid payloads fall back to source when rendering fails", async () => {
    const render = vi.fn().mockRejectedValue(new Error("bad diagram"));

    renderMermaidPayload("graph TD\nA -->");

    await hydrateMermaidPayloads(document.body, {
      loadRenderer: async () => ({
        initialize: vi.fn(),
        render,
      }),
    });

    expect(document.querySelector(".payload-mermaid__diagram svg")).toBeNull();
    expect(document.querySelector(".payload-mermaid__status")?.textContent).toBe(
      "Source preview",
    );
    expect(document.querySelector(".payload-mermaid__error")?.textContent).toContain(
      "Diagram rendering failed",
    );
    expect(
      document.querySelector<HTMLDetailsElement>("[data-mermaid-source-panel]")?.open,
    ).toBe(true);
    expect(document.querySelector(".payload-mermaid__source-code")?.textContent).toContain(
      "A -->",
    );
  });

  it("VFR-MARKDOWN-003 markdown mermaid fences hydrate as embedded diagrams", async () => {
    const initialize = vi.fn();
    const render = vi.fn().mockResolvedValue({
      svg: '<svg viewBox="0 0 10 10"><text>Embedded</text></svg>',
    });

    renderMarkdownMermaidPayload("graph TD\nA[Agent] --> B[Viewer]");

    await hydrateMermaidPayloads(document.body, {
      loadRenderer: async () => ({
        initialize,
        render,
      }),
    });

    expect(initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
    });
    expect(render).toHaveBeenCalledWith(
      "visual-aid-mermaid-0",
      expect.stringContaining("graph TD\nA[Agent] --> B[Viewer]"),
    );
    expect(
      document.querySelector(".payload-markdown .payload-mermaid__diagram svg"),
    ).not.toBeNull();
    expect(
      document.querySelector(".payload-markdown .payload-mermaid__status")?.textContent,
    ).toBe("Rendered diagram");
  });

  it("VFR-MARKDOWN-004 markdown mermaid fences fall back to source when rendering fails", async () => {
    const render = vi.fn().mockRejectedValue(new Error("bad embedded diagram"));

    renderMarkdownMermaidPayload("graph TD\nA -->");

    await hydrateMermaidPayloads(document.body, {
      loadRenderer: async () => ({
        initialize: vi.fn(),
        render,
      }),
    });

    expect(
      document.querySelector(".payload-markdown .payload-mermaid__diagram svg"),
    ).toBeNull();
    expect(
      document.querySelector(".payload-markdown .payload-mermaid__status")?.textContent,
    ).toBe("Source preview");
    expect(
      document.querySelector(".payload-markdown .payload-mermaid__error")?.textContent,
    ).toContain("Diagram rendering failed");
    expect(
      document.querySelector(".payload-markdown .payload-mermaid__source-code")?.textContent,
    ).toContain("A -->");
  });
});
