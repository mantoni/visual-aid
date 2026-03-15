// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { hydrateMermaidPayloads, resetMermaidRendererForTests } from "../../src/mermaid";
import { renderAppHtml } from "../../src/render";

const renderMermaidPayload = (
  content: string,
  options?: {
    appTheme?: "dark" | "light";
  },
) => {
  const body = renderAppHtml({
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

  document.body.innerHTML = options?.appTheme
    ? `<div id="app" data-theme="${options.appTheme}">${body}</div>`
    : body;
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
      fontSize: 17,
      theme: "neutral",
      themeVariables: {
        fontSize: "17px",
      },
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

  it("VFR-MERMAID-003 mermaid payloads recover from invalid cylinder shorthand", async () => {
    const render = vi
      .fn()
      .mockImplementation(async () => {
        if (render.mock.calls.length === 1) {
          throw new Error("parse error");
        }

        return {
          svg: '<svg viewBox="0 0 10 10"><text>Recovered</text></svg>',
        };
      });

    renderMermaidPayload(
      'flowchart LR\nDomainKV[(("DOMAIN_MAP_KV"))]\nAdminES[(("AdminEventStore"))]',
    );

    await hydrateMermaidPayloads(document.body, {
      loadRenderer: async () => ({
        initialize: vi.fn(),
        render,
      }),
    });

    expect(render).toHaveBeenNthCalledWith(
      1,
      "visual-aid-mermaid-0",
      expect.stringContaining('DomainKV[(("DOMAIN_MAP_KV"))]'),
    );
    expect(render).toHaveBeenCalledTimes(2);
    expect(render).toHaveBeenNthCalledWith(
      2,
      "visual-aid-mermaid-0",
      expect.stringContaining('DomainKV[("DOMAIN_MAP_KV")]'),
    );
    expect(render).toHaveBeenNthCalledWith(
      2,
      "visual-aid-mermaid-0",
      expect.stringContaining('AdminES[("AdminEventStore")]'),
    );
    expect(document.querySelector(".payload-mermaid__diagram svg")).not.toBeNull();
    expect(document.querySelector(".payload-mermaid__status")?.textContent).toBe(
      "Rendered diagram",
    );
    expect(document.querySelector(".payload-mermaid__error")?.textContent).toBe("");
    expect(document.querySelector(".payload-mermaid__source-code")?.textContent).toContain(
      'DomainKV[(("DOMAIN_MAP_KV"))]',
    );
  });

  it("VFR-MERMAID-004 mermaid payloads use the active dark theme", async () => {
    const initialize = vi.fn();
    const render = vi.fn().mockResolvedValue({
      svg: '<svg viewBox="0 0 10 10"><text>Dark</text></svg>',
    });

    renderMermaidPayload("graph TD\nA[Agent] --> B[Viewer]", {
      appTheme: "dark",
    });

    await hydrateMermaidPayloads(document.body, {
      loadRenderer: async () => ({
        initialize,
        render,
      }),
    });

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        startOnLoad: false,
        securityLevel: "strict",
        darkMode: true,
        fontSize: 17,
        theme: "base",
        themeVariables: expect.objectContaining({
          background: "#09111a",
          fontSize: "17px",
          mainBkg: "#f0e7db",
          lineColor: "#f0e7db",
          edgeLabelBackground: "#09111a",
        }),
      }),
    );
    expect(document.querySelector(".payload-mermaid__diagram svg")).not.toBeNull();
    expect(document.querySelector(".payload-mermaid__status")?.textContent).toBe(
      "Rendered diagram",
    );
  });

  it("VFR-MERMAID-005 dark mermaid payloads keep edge labels readable without shrinking wide diagrams", async () => {
    const render = vi.fn().mockResolvedValue({
      svg: [
        '<svg viewBox="0 0 400 120" style="max-width: 400px;">',
        '  <g class="edgeLabel">',
        '    <g class="label">',
        '      <foreignObject width="0" height="0">',
        '        <div xmlns="http://www.w3.org/1999/xhtml" class="labelBkg">',
        '          <span class="edgeLabel">emit events</span>',
        "        </div>",
        "      </foreignObject>",
        "    </g>",
        "  </g>",
        '  <g class="node">',
        '    <rect x="10" y="10" width="120" height="40"></rect>',
        '    <g class="label"><text>Node</text></g>',
        "  </g>",
        "</svg>",
      ].join(""),
      bindFunctions: (element: Element) => {
        const svg = element.querySelector("svg");
        if (svg) {
          const bbox = {
            x: 10,
            y: 10,
            width: 120,
            height: 40,
            top: 10,
            right: 130,
            bottom: 50,
            left: 10,
            toJSON: () => "",
          } as DOMRect;

          (svg as SVGSVGElement).getBBox = () => bbox;
        }
      },
    });

    renderMermaidPayload("graph TD\nA -->|emit events| B", {
      appTheme: "dark",
    });

    await hydrateMermaidPayloads(document.body, {
      loadRenderer: async () => ({
        initialize: vi.fn(),
        render,
      }),
    });

    const svg = document.querySelector<SVGSVGElement>(".payload-mermaid__diagram svg");
    const edgeLabel = document.querySelector<HTMLElement>(
      ".payload-mermaid__diagram span.edgeLabel",
    );
    const labelBackground = document.querySelector<HTMLElement>(
      ".payload-mermaid__diagram .labelBkg",
    );

    expect(svg?.getAttribute("width")).toBe("128");
    expect(svg?.getAttribute("height")).toBeNull();
    expect(svg?.getAttribute("preserveAspectRatio")).toBe("xMinYMin meet");
    expect(svg?.getAttribute("viewBox")).toBe("6 6 128 48");
    expect(svg?.style.width).toBe("100%");
    expect(svg?.style.minWidth).toBe("128px");
    expect(svg?.style.maxWidth).toBe("none");
    expect(edgeLabel?.style.color).toBe("rgb(245, 241, 232)");
    expect(edgeLabel?.style.fill).toBe("rgb(245, 241, 232)");
    expect(labelBackground?.style.backgroundColor).toBe("rgba(9, 17, 26, 0.82)");
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
      fontSize: 17,
      theme: "neutral",
      themeVariables: {
        fontSize: "17px",
      },
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
