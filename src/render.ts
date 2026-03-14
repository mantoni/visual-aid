import type { VisualAidPayload } from "./bridge";
import MarkdownIt from "markdown-it";
import { hydrateMermaidPayloads } from "./mermaid";
import {
  formatLabels,
  resolveSelectedIndex,
  type VisualAidState,
} from "./view-model";

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const escapeHtmlAttribute = (value: string) =>
  escapeHtml(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

type MarkdownToken = {
  info: string;
  attrSet(name: string, value: string): void;
};

type MarkdownRendererLike = {
  renderToken(tokens: MarkdownToken[], idx: number, options: unknown): string;
};

type MarkdownRenderRule = (
  tokens: MarkdownToken[],
  idx: number,
  options: unknown,
  env: unknown,
  self: MarkdownRendererLike,
) => string;

const sortObjectKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortObjectKeys(nested)]),
    );
  }

  return value;
};

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
});

const existingMarkdownFence = markdownRenderer.renderer.rules.fence
  ?.bind(markdownRenderer.renderer.rules) as MarkdownRenderRule | undefined;

const defaultMarkdownFence: MarkdownRenderRule =
  existingMarkdownFence ??
  ((
    tokens: MarkdownToken[],
    idx: number,
    options: unknown,
    _env: unknown,
    self: MarkdownRendererLike,
  ) => self.renderToken(tokens, idx, options));

markdownRenderer.renderer.rules.fence = (
  tokens: MarkdownToken[],
  idx: number,
  options: unknown,
  env: unknown,
  self: MarkdownRendererLike,
) => {
  const token = tokens[idx];
  const language = token?.info.trim().split(/\s+/, 1)[0] ?? "";
  const rendered = defaultMarkdownFence(tokens, idx, options, env, self).replace(
    "<pre><code",
    '<pre class="payload-pre payload-pre--markdown"><code',
  );

  if (!language) {
    return `<div class="payload-markdown__code-block">${rendered}</div>`;
  }

  return `
    <div class="payload-markdown__code-block">
      <div class="payload-markdown__code-label">${escapeHtml(language)}</div>
      ${rendered}
    </div>
  `;
};

markdownRenderer.renderer.rules.table_open = () =>
  '<div class="payload-markdown__table-wrap"><table>';
markdownRenderer.renderer.rules.table_close = () => "</table></div>";

markdownRenderer.renderer.rules.link_open = (
  tokens: MarkdownToken[],
  idx: number,
  options: unknown,
  _env: unknown,
  self: MarkdownRendererLike,
) => {
  const token = tokens[idx];

  token?.attrSet("target", "_blank");
  token?.attrSet("rel", "noreferrer");

  return self.renderToken(tokens, idx, options);
};

const renderMarkdown = (content: string) =>
  `<div class="payload-markdown">${markdownRenderer.render(content)}</div>`;

const classifyDiffLine = (line: string) => {
  if (line.startsWith("@@")) {
    return "hunk";
  }

  if (line.startsWith("+++ ") || line.startsWith("--- ")) {
    return "file";
  }

  if (line.startsWith("+")) {
    return "add";
  }

  if (line.startsWith("-")) {
    return "remove";
  }

  return "context";
};

const renderDiff = (content: string) => {
  const rows = content
    .split("\n")
    .map((line) => {
      const kind = classifyDiffLine(line);

      return `
        <div class="payload-diff__line payload-diff__line--${kind}">
          <span class="payload-diff__gutter">${escapeHtml(
            kind === "context" ? " " : line.slice(0, 1),
          )}</span>
          <code>${escapeHtml(line)}</code>
        </div>
      `;
    })
    .join("");

  return `<div class="payload-diff">${rows}</div>`;
};

const renderMermaid = (content: string) => {
  const firstLine = content.split("\n").find((line) => line.trim().length > 0) ?? "diagram";

  return `
    <div class="payload-mermaid">
      <div class="payload-special__header">
        <span class="payload-special__badge">Rendered Diagram</span>
        <strong>${escapeHtml(firstLine)}</strong>
      </div>
      <div class="payload-mermaid__diagram" data-mermaid-diagram>
        <div class="payload-mermaid__placeholder">Rendering diagram...</div>
      </div>
      <p class="payload-mermaid__status" data-mermaid-status>Rendering diagram</p>
      <p class="payload-mermaid__error" data-mermaid-error hidden></p>
      <details class="payload-mermaid__source" data-mermaid-source-panel>
        <summary>Source</summary>
        <pre class="payload-pre payload-pre--mermaid"><code class="payload-mermaid__source-code" data-mermaid-source-code>${escapeHtml(content)}</code></pre>
      </details>
    </div>
  `;
};

const renderExcalidraw = (content: string) => {
  let parsed: unknown = null;
  let elementCount = 0;
  let appStateKeys = 0;

  try {
    parsed = JSON.parse(content) as {
      elements?: unknown[];
      appState?: Record<string, unknown>;
    };
    if (parsed && typeof parsed === "object") {
      const value = parsed as {
        elements?: unknown[];
        appState?: Record<string, unknown>;
      };
      elementCount = Array.isArray(value.elements) ? value.elements.length : 0;
      appStateKeys =
        value.appState && typeof value.appState === "object"
          ? Object.keys(value.appState).length
          : 0;
    }
  } catch {
    parsed = null;
  }

  return `
    <div class="payload-excalidraw">
      <div class="payload-special__header">
        <span class="payload-special__badge">Canvas Summary</span>
        <strong>${parsed ? `${elementCount} elements` : "Unparsed payload"}</strong>
      </div>
      <div class="payload-special__stats">
        <div><span>Elements</span><strong>${elementCount}</strong></div>
        <div><span>App State Keys</span><strong>${appStateKeys}</strong></div>
      </div>
      <pre class="payload-pre"><code>${escapeHtml(content)}</code></pre>
    </div>
  `;
};

const htmlFragmentStyles = [
  ":root {",
  '  color-scheme: dark;',
  '  font-family: "Avenir Next", "Segoe UI", sans-serif;',
  "}",
  "body {",
  "  margin: 0;",
  "  padding: 20px;",
  "  background: #0b1118;",
  "  color: #f2eee6;",
  "}",
  ".payload-html-doc {",
  "  line-height: 1.6;",
  "}",
  ".payload-html-fragment > :first-child {",
  "  margin-top: 0;",
  "}",
  ".payload-html-fragment > :last-child {",
  "  margin-bottom: 0;",
  "}",
  "h1, h2, h3, h4, h5, h6 {",
  "  margin: 0 0 0.8rem;",
  "  line-height: 1.15;",
  "}",
  "p, ul, ol, table, pre, blockquote {",
  "  margin: 0 0 1rem;",
  "}",
  "ul, ol {",
  "  padding-left: 1.25rem;",
  "}",
  "table {",
  "  width: 100%;",
  "  border-collapse: collapse;",
  "}",
  "th, td {",
  "  padding: 0.65rem 0.75rem;",
  "  border: 1px solid rgba(143, 208, 244, 0.18);",
  "  text-align: left;",
  "  vertical-align: top;",
  "}",
  "th {",
  "  background: rgba(143, 208, 244, 0.12);",
  "}",
  "pre, code {",
  '  font-family: "JetBrains Mono", "SFMono-Regular", monospace;',
  "}",
  "pre {",
  "  padding: 1rem;",
  "  border-radius: 12px;",
  "  background: rgba(5, 7, 10, 0.62);",
  "  overflow: auto;",
  "}",
  "blockquote {",
  "  padding-left: 1rem;",
  "  border-left: 3px solid rgba(240, 177, 108, 0.72);",
  "  color: rgba(242, 238, 230, 0.82);",
  "}",
  ".va-callout {",
  "  padding: 1rem 1.1rem;",
  "  border-radius: 14px;",
  "  border: 1px solid rgba(240, 177, 108, 0.22);",
  "  background: rgba(240, 177, 108, 0.08);",
  "}",
  ".va-card {",
  "  padding: 1rem 1.1rem;",
  "  border-radius: 14px;",
  "  border: 1px solid rgba(143, 208, 244, 0.2);",
  "  background: rgba(143, 208, 244, 0.08);",
  "}",
].join("\n");

const renderHtml = (content: string) => {
  const srcdoc = [
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="utf-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `    <style>${htmlFragmentStyles}</style>`,
    "  </head>",
    '  <body class="payload-html-doc">',
    `    <main class="payload-html-fragment">${content}</main>`,
    "  </body>",
    "</html>",
  ].join("\n");

  return `
    <div class="payload-html">
      <iframe
        class="payload-html__frame"
        title="HTML payload"
        sandbox
        referrerpolicy="no-referrer"
        srcdoc="${escapeHtmlAttribute(srcdoc)}"
      ></iframe>
    </div>
  `;
};

export const renderContent = (payload: VisualAidPayload) => {
  if (payload.format === "markdown") {
    return renderMarkdown(payload.content);
  }

  if (payload.format === "diff") {
    return renderDiff(payload.content);
  }

  if (payload.format === "mermaid") {
    return renderMermaid(payload.content);
  }

  if (payload.format === "excalidraw") {
    return renderExcalidraw(payload.content);
  }

  if (payload.format === "html") {
    return renderHtml(payload.content);
  }

  return `<pre class="payload-pre"><code>${escapeHtml(payload.content)}</code></pre>`;
};

export const renderMetadata = (payload: VisualAidPayload) => {
  if (!payload.metadata || Object.keys(payload.metadata).length === 0) {
    return '<p class="metadata-empty">No metadata supplied.</p>';
  }

  return `<pre class="payload-pre payload-pre--meta"><code>${escapeHtml(
    JSON.stringify(sortObjectKeys(payload.metadata), null, 2),
  )}</code></pre>`;
};

export const renderAppHtml = (state: VisualAidState) => {
  const selectedIndex = resolveSelectedIndex(state.session, state.selectedIndex);
  const current =
    selectedIndex === null ? null : state.session.items[selectedIndex] ?? null;
  const history = state.session.items
    .slice()
    .reverse()
    .map((item, index) => {
      const sessionIndex = state.session.items.length - 1 - index;
      const title = item.title ?? `${formatLabels[item.format]} payload`;

      return `
        <button
          class="history-item${sessionIndex === selectedIndex ? " history-item--active" : ""}"
          type="button"
          data-history-index="${sessionIndex}"
          aria-pressed="${sessionIndex === selectedIndex ? "true" : "false"}"
        >
          <span class="history-item__title">${escapeHtml(title)}</span>
          <span class="history-item__meta">${escapeHtml(item.format)}</span>
        </button>
      `;
    })
    .join("");

  return `
    <div class="shell">
      <header class="hero">
        <div>
          <p class="eyebrow">Agent Visualization Surface</p>
          <h1>visual-aid</h1>
          <p class="hero__copy">
            A desktop surface for structured agent output. The app renders format-aware payloads, keeps session history in the sidebar, and can recover the last good local session snapshot.
          </p>
        </div>
        <div class="status-card">
          <span class="status-card__label">Status</span>
          <strong>${escapeHtml(state.status)}</strong>
        </div>
      </header>
      <main class="layout">
        <section class="panel panel--viewer">
          <div class="panel__header">
            <div>
              <p class="panel__label">Current Payload</p>
              <h2>${escapeHtml(current?.title ?? "Waiting For Payloads")}</h2>
            </div>
            <span class="format-chip">${escapeHtml(
              current ? formatLabels[current.format] : "Idle",
            )}</span>
          </div>
          <p class="panel__summary">
            ${escapeHtml(
              current?.summary ??
                "Dispatch a visual-aid.show payload to replace or append content here.",
            )}
          </p>
          ${current ? renderContent(current) : '<div class="empty-state">No payload has been received yet.</div>'}
        </section>
        <aside class="sidebar">
          <section class="panel">
            <div class="panel__header">
              <div>
                <p class="panel__label">Payload History</p>
                <h2>${state.session.items.length} item${state.session.items.length === 1 ? "" : "s"}</h2>
              </div>
            </div>
            <div class="history-list">
              ${history || '<div class="empty-state empty-state--compact">History is empty.</div>'}
            </div>
          </section>
          <section class="panel">
            <div class="panel__header">
              <div>
                <p class="panel__label">Metadata</p>
                <h2>Envelope Details</h2>
              </div>
            </div>
            ${current ? renderMetadata(current) : '<div class="empty-state empty-state--compact">No envelope loaded.</div>'}
          </section>
        </aside>
      </main>
    </div>
  `;
};

export const renderInto = (target: HTMLElement, state: VisualAidState) => {
  target.innerHTML = renderAppHtml(state);
  void hydrateMermaidPayloads(target).catch((error) => {
    console.error("Failed to hydrate Mermaid payloads:", error);
  });
};
