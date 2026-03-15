import DOMPurify from "dompurify";
import type { VisualAidPayload } from "./bridge";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import jsxLanguage from "highlight.js/lib/languages/javascript";
import markdown from "highlight.js/lib/languages/markdown";
import MarkdownIt from "markdown-it";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import tsxLanguage from "highlight.js/lib/languages/xml";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { hydrateMermaidPayloads } from "./mermaid";
import {
  appDisplayName,
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
  escapeHtml(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");

type MarkdownToken = {
  content: string;
  info: string;
  attrSet(name: string, value: string): void;
};

type MarkdownRendererLike = {
  renderToken(tokens: MarkdownToken[], idx: number, options: unknown): string;
};

const codeLanguages = {
  bash,
  css,
  diff,
  go,
  java,
  javascript,
  json,
  jsx: jsxLanguage,
  markdown,
  python,
  rust,
  sql,
  tsx: tsxLanguage,
  typescript,
  xml,
  yaml,
};

Object.entries(codeLanguages).forEach(([name, language]) => {
  hljs.registerLanguage(name, language);
});

const normalizeLanguage = (value: string | null | undefined) => {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized.length === 0) {
    return null;
  }

  const aliases: Record<string, string> = {
    html: "xml",
    js: "javascript",
    patch: "diff",
    shell: "bash",
    sh: "bash",
    ts: "typescript",
    yml: "yaml",
  };

  return aliases[normalized] ?? normalized;
};

const highlightCode = (content: string, languageHint?: string | null) => {
  const normalizedLanguage = normalizeLanguage(languageHint);

  if (normalizedLanguage && hljs.getLanguage(normalizedLanguage)) {
    return {
      html: hljs.highlight(content, {
        ignoreIllegals: true,
        language: normalizedLanguage,
      }).value,
      language: normalizedLanguage,
    };
  }

  if (!normalizedLanguage) {
    const result = hljs.highlightAuto(content);

    if (result.language) {
      return {
        html: result.value,
        language: result.language,
      };
    }
  }

  return {
    html: escapeHtml(content),
    language: normalizedLanguage,
  };
};

const renderHighlightedCodeBlock = (
  content: string,
  languageHint?: string | null,
  preClassName = "payload-pre--code",
) => {
  const { html } = highlightCode(content, languageHint);

  return `<pre class="payload-pre ${preClassName}"><code class="hljs">${html}</code></pre>`;
};

const codeLanguageFromPayload = (payload: VisualAidPayload) =>
  typeof payload.language === "string" ? payload.language : null;

const renderCode = (payload: VisualAidPayload) => {
  const explicitLanguage = codeLanguageFromPayload(payload);
  const { language } = highlightCode(payload.content, explicitLanguage);
  const label = explicitLanguage ?? language;

  return `
    <div class="payload-code">
      <div class="payload-code__header">
        <span class="payload-special__badge">Source Code</span>
        ${label ? `<span class="payload-code__label">${escapeHtml(label)}</span>` : ""}
      </div>
      ${renderHighlightedCodeBlock(payload.content, explicitLanguage)}
    </div>
  `;
};

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

const renderDiff = (
  content: string,
  options?: {
    embedded?: boolean;
  },
) => {
  const embeddedClass = options?.embedded ? " payload-diff--embedded" : "";
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

  return `<div class="payload-diff${embeddedClass}">${rows}</div>`;
};

const renderMermaid = (
  content: string,
  options?: {
    embedded?: boolean;
  },
) => {
  const firstLine =
    content.split("\n").find((line) => line.trim().length > 0) ?? "diagram";
  const embeddedClass = options?.embedded ? " payload-mermaid--embedded" : "";

  return `
    <div class="payload-mermaid${embeddedClass}">
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

const markdownRenderer = new MarkdownIt({
  html: true,
  linkify: true,
});

markdownRenderer.renderer.rules.fence = (
  tokens: MarkdownToken[],
  idx: number,
  _options: unknown,
  _env: unknown,
  _self: MarkdownRendererLike,
) => {
  const token = tokens[idx];
  const language = token?.info.trim().split(/\s+/, 1)[0] ?? "";

  if (normalizeLanguage(language) === "mermaid") {
    return renderMermaid(token?.content ?? "", { embedded: true });
  }

  if (normalizeLanguage(language) === "diff") {
    return renderDiff(token?.content ?? "", { embedded: true });
  }

  const rendered = renderHighlightedCodeBlock(
    token?.content ?? "",
    language,
    "payload-pre--markdown payload-pre--code",
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
  `<div class="payload-markdown">${DOMPurify.sanitize(
    markdownRenderer.render(content),
    {
      ADD_ATTR: ["rel", "target"],
      FORBID_ATTR: ["style"],
      FORBID_TAGS: ["iframe", "script", "style"],
    },
  )}</div>`;

const describeJsonValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (value && typeof value === "object") {
    const size = Object.keys(value as Record<string, unknown>).length;
    return `${size} key${size === 1 ? "" : "s"}`;
  }

  if (value === null) {
    return "null";
  }

  return typeof value;
};

const renderJsonNode = (value: unknown, key?: string): string => {
  const keyMarkup = key
    ? `<span class="payload-json__key">${escapeHtml(key)}</span>`
    : "";

  if (Array.isArray(value)) {
    const children = value
      .map((item, index) => renderJsonNode(item, `[${index}]`))
      .join("");

    return `
      <details class="payload-json__node" open>
        <summary>${keyMarkup}<span class="payload-json__type">Array</span><span class="payload-json__meta">${value.length} item${value.length === 1 ? "" : "s"}</span></summary>
        <div class="payload-json__children">${children || '<div class="payload-json__leaf payload-json__leaf--empty">[]</div>'}</div>
      </details>
    `;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const children = entries
      .map(([childKey, childValue]) => renderJsonNode(childValue, childKey))
      .join("");

    return `
      <details class="payload-json__node" open>
        <summary>${keyMarkup}<span class="payload-json__type">Object</span><span class="payload-json__meta">${entries.length} key${entries.length === 1 ? "" : "s"}</span></summary>
        <div class="payload-json__children">${children || '<div class="payload-json__leaf payload-json__leaf--empty">{}</div>'}</div>
      </details>
    `;
  }

  const primitive =
    typeof value === "string"
      ? `"${escapeHtml(value)}"`
      : escapeHtml(String(value));
  const primitiveType = value === null ? "null" : typeof value;

  return `
    <div class="payload-json__leaf">
      ${keyMarkup}
      <code class="payload-json__value payload-json__value--${primitiveType}">${primitive}</code>
    </div>
  `;
};

const renderJson = (content: string) => {
  try {
    const parsed = JSON.parse(content) as unknown;
    const rootType = Array.isArray(parsed)
      ? "Array"
      : parsed === null
        ? "Null"
        : typeof parsed === "object"
          ? "Object"
          : typeof parsed === "string"
            ? "String"
            : typeof parsed === "number"
              ? "Number"
              : typeof parsed === "boolean"
                ? "Boolean"
                : "Value";

    return `
      <div class="payload-json">
        <div class="payload-special__header">
          <span class="payload-special__badge">Parsed JSON</span>
          <strong>${rootType} · ${escapeHtml(describeJsonValue(parsed))}</strong>
        </div>
        <div class="payload-json__tree">
          ${renderJsonNode(parsed)}
        </div>
        <details class="payload-json__raw">
          <summary>Raw JSON</summary>
          <pre class="payload-pre payload-pre--json"><code>${escapeHtml(JSON.stringify(parsed, null, 2))}</code></pre>
        </details>
      </div>
    `;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse JSON payload.";

    return `
      <div class="payload-json">
        <div class="payload-special__header">
          <span class="payload-special__badge">Unparsed JSON</span>
          <strong>${escapeHtml(message)}</strong>
        </div>
        <pre class="payload-pre payload-pre--json"><code>${escapeHtml(content)}</code></pre>
      </div>
    `;
  }
};

const htmlFragmentStyles = [
  ":root {",
  "  color-scheme: light dark;",
  '  font-family: "Avenir Next", "SF Pro Display", "Segoe UI", sans-serif;',
  "  --va-bg: #0d141b;",
  "  --va-surface: rgba(6, 11, 16, 0.78);",
  "  --va-border: rgba(143, 208, 244, 0.18);",
  "  --va-text: #f5f1e8;",
  "  --va-muted: rgba(245, 241, 232, 0.78);",
  "  --va-accent: #f0b16c;",
  "  --va-accent-line: rgba(240, 177, 108, 0.72);",
  "  --va-accent-soft: rgba(240, 177, 108, 0.08);",
  "  --va-accent-border: rgba(240, 177, 108, 0.22);",
  "  --va-link: #8fd0f4;",
  "  --va-link-soft: rgba(143, 208, 244, 0.12);",
  "  --va-link-border: rgba(143, 208, 244, 0.2);",
  "  --va-code-bg: rgba(5, 7, 10, 0.62);",
  "}",
  "@media (prefers-color-scheme: light) {",
  "  :root {",
  "    --va-bg: #f7f2e9;",
  "    --va-surface: rgba(255, 255, 255, 0.92);",
  "    --va-border: rgba(44, 64, 82, 0.14);",
  "    --va-text: #1d2430;",
  "    --va-muted: rgba(29, 36, 48, 0.72);",
  "    --va-accent: #b96e2b;",
  "    --va-accent-line: rgba(185, 110, 43, 0.64);",
  "    --va-accent-soft: rgba(185, 110, 43, 0.08);",
  "    --va-accent-border: rgba(185, 110, 43, 0.2);",
  "    --va-link: #1b6f92;",
  "    --va-link-soft: rgba(27, 111, 146, 0.1);",
  "    --va-link-border: rgba(27, 111, 146, 0.16);",
  "    --va-code-bg: rgba(226, 232, 238, 0.9);",
  "  }",
  "}",
  "html {",
  "  margin: 0;",
  "  padding: 0;",
  "  box-sizing: border-box;",
  "}",
  "*, *::before, *::after {",
  "  box-sizing: inherit;",
  "}",
  "body {",
  "  margin: 0;",
  "  background: var(--va-bg);",
  "  color: var(--va-text);",
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
  "  border: 1px solid var(--va-border);",
  "  text-align: left;",
  "  vertical-align: top;",
  "}",
  "th {",
  "  background: var(--va-link-soft);",
  "}",
  "pre, code {",
  '  font-family: "JetBrains Mono", "SFMono-Regular", monospace;',
  "}",
  "pre {",
  "  padding: 1rem;",
  "  border-radius: 12px;",
  "  background: var(--va-code-bg);",
  "  overflow: auto;",
  "}",
  "blockquote {",
  "  padding-left: 1rem;",
  "  border-left: 3px solid var(--va-accent-line);",
  "  color: var(--va-muted);",
  "}",
  ".va-callout {",
  "  padding: 1rem 1.1rem;",
  "  border-radius: 14px;",
  "  border: 1px solid var(--va-accent-border);",
  "  background: var(--va-accent-soft);",
  "}",
  ".va-card {",
  "  padding: 1rem 1.1rem;",
  "  border-radius: 14px;",
  "  border: 1px solid var(--va-link-border);",
  "  background: var(--va-link-soft);",
  "}",
].join("\n");

const minimumHtmlFrameHeight = 420;
const htmlHydrationCleanupByTarget = new WeakMap<HTMLElement, () => void>();

const parseCssPixels = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const measureAvailableHtmlFrameHeight = (frame: HTMLIFrameElement) => {
  if (typeof window === "undefined") {
    return minimumHtmlFrameHeight;
  }

  const container = frame.closest<HTMLElement>(".payload-html");
  const toolbar =
    frame
      .closest<HTMLElement>(".shell--document")
      ?.querySelector<HTMLElement>(".document-toolbar") ??
    frame.ownerDocument.querySelector<HTMLElement>(".document-toolbar");
  const toolbarHeight =
    toolbar?.getBoundingClientRect().height ?? toolbar?.offsetHeight ?? 0;
  const containerStyles = container ? window.getComputedStyle(container) : null;
  const containerPadding =
    (containerStyles ? parseCssPixels(containerStyles.paddingTop) : 0) +
    (containerStyles ? parseCssPixels(containerStyles.paddingBottom) : 0);

  return Math.max(
    minimumHtmlFrameHeight,
    window.innerHeight - toolbarHeight - containerPadding,
  );
};

const syncHtmlFrameHeight = (frame: HTMLIFrameElement) => {
  const nextHeight = measureAvailableHtmlFrameHeight(frame);

  if (nextHeight > 0) {
    frame.style.height = `${nextHeight}px`;
  }
};

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
        sandbox="allow-same-origin"
        referrerpolicy="no-referrer"
        srcdoc="${escapeHtmlAttribute(srcdoc)}"
      ></iframe>
    </div>
  `;
};

export const cleanupRenderEffects = (target: HTMLElement) => {
  htmlHydrationCleanupByTarget.get(target)?.();
  htmlHydrationCleanupByTarget.delete(target);
};

const hydrateHtmlPayloads = (target: HTMLElement) => {
  const frames = Array.from(
    target.querySelectorAll<HTMLIFrameElement>(".payload-html__frame"),
  );

  if (frames.length === 0) {
    htmlHydrationCleanupByTarget.delete(target);
    return;
  }

  const resizeFrames = () => {
    frames.forEach((frame) => {
      syncHtmlFrameHeight(frame);
    });
  };

  window.addEventListener("resize", resizeFrames);

  frames.forEach((frame) => {
    const container = frame.closest<HTMLElement>(".payload-html");

    if (!container) {
      return;
    }

    container.classList.add("payload-html--loading");

    const markReady = () => {
      syncHtmlFrameHeight(frame);
      container.classList.remove("payload-html--loading");
    };

    frame.addEventListener("load", markReady, { once: true });

    if (frame.contentDocument?.readyState === "complete") {
      markReady();
    }
  });

  htmlHydrationCleanupByTarget.set(target, () => {
    window.removeEventListener("resize", resizeFrames);
  });
};

export const renderContent = (payload: VisualAidPayload) => {
  if (payload.format === "markdown") {
    return renderMarkdown(payload.content);
  }

  if (payload.format === "code") {
    return renderCode(payload);
  }

  if (payload.format === "diff") {
    return renderDiff(payload.content);
  }

  if (payload.format === "json") {
    return renderJson(payload.content);
  }

  if (payload.format === "mermaid") {
    return renderMermaid(payload.content);
  }

  if (payload.format === "html") {
    return renderHtml(payload.content);
  }

  return `<pre class="payload-pre"><code>${escapeHtml(payload.content)}</code></pre>`;
};

const renderWorkspaceTabs = (
  workspaceState: VisualAidState["workspaceState"],
  selectedWorkspaceId: string | null,
) => {
  if (!workspaceState || workspaceState.workspaces.length === 0) {
    return "";
  }

  if (workspaceState.workspaces.length === 1) {
    const workspace = workspaceState.workspaces[0];

    if (!workspace) {
      return "";
    }

    const closeLabel = `Close ${workspace.label} tab`;
    const tooltipId = "workspace-tooltip-0";

    return `
      <div class="workspace-switcher workspace-switcher--single" aria-label="Workspace">
        <div class="workspace-tab-item workspace-tab-item--active">
          <button
            class="workspace-tab workspace-tab--active"
            type="button"
            data-workspace-id="${escapeHtmlAttribute(workspace.id)}"
            aria-pressed="true"
            aria-describedby="${escapeHtmlAttribute(tooltipId)}"
          >
            <span class="workspace-tab__label">${escapeHtml(workspace.label)}</span>
          </button>
          <button
            class="workspace-tab__close"
            type="button"
            data-close-workspace-id="${escapeHtmlAttribute(workspace.id)}"
            aria-label="${escapeHtmlAttribute(closeLabel)}"
          >
            <span class="workspace-tab__close-icon" aria-hidden="true">x</span>
          </button>
          <span
            id="${escapeHtmlAttribute(tooltipId)}"
            class="workspace-tab__tooltip"
            role="tooltip"
          >
            ${escapeHtml(workspace.cwd)}
          </span>
        </div>
      </div>
    `;
  }

  return `
    <nav class="workspace-switcher" aria-label="Workspaces">
      ${workspaceState.workspaces
        .map((workspace, index) => {
          const isActive = workspace.id === selectedWorkspaceId;
          const closeLabel = `Close ${workspace.label} tab`;
          const tooltipId = `workspace-tooltip-${index}`;

          return `
            <div class="workspace-tab-item${isActive ? " workspace-tab-item--active" : ""}">
              <button
                class="workspace-tab${isActive ? " workspace-tab--active" : ""}"
                type="button"
                data-workspace-id="${escapeHtmlAttribute(workspace.id)}"
                aria-pressed="${isActive ? "true" : "false"}"
                aria-describedby="${escapeHtmlAttribute(tooltipId)}"
              >
                <span class="workspace-tab__label">${escapeHtml(workspace.label)}</span>
              </button>
              <button
                class="workspace-tab__close"
                type="button"
                data-close-workspace-id="${escapeHtmlAttribute(workspace.id)}"
                aria-label="${escapeHtmlAttribute(closeLabel)}"
              >
                <span class="workspace-tab__close-icon" aria-hidden="true">x</span>
              </button>
              <span
                id="${escapeHtmlAttribute(tooltipId)}"
                class="workspace-tab__tooltip"
                role="tooltip"
              >
                ${escapeHtml(workspace.cwd)}
              </span>
            </div>
          `;
        })
        .join("")}
    </nav>
  `;
};

const renderHistory = (
  session: VisualAidState["session"],
  selectedIndex: number | null,
) =>
  session.items
    .slice()
    .reverse()
    .map((item, index) => {
      const sessionIndex = session.items.length - 1 - index;
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

const renderHistorySheet = (
  session: VisualAidState["session"],
  selectedIndex: number | null,
  historyOpen: boolean,
) => {
  const history = renderHistory(session, selectedIndex);

  return `
    <div
      class="history-overlay${historyOpen ? " history-overlay--open" : ""}"
      aria-hidden="${historyOpen ? "false" : "true"}"
    >
      <button
        class="history-overlay__backdrop"
        type="button"
        data-history-dismiss
        aria-label="Close recent payloads"
      ></button>
      <aside
        id="history-sheet"
        class="history-sheet${historyOpen ? " history-sheet--open" : ""}"
        aria-label="Recent payloads"
      >
        <div class="history-sheet__header">
          <div>
            <p class="panel__label">Recent Payloads</p>
            <h2>${session.items.length} item${session.items.length === 1 ? "" : "s"}</h2>
          </div>
          <button class="history-sheet__close" type="button" data-history-dismiss>
            Done
          </button>
        </div>
        <div class="history-list">
          ${history || '<div class="empty-state empty-state--compact">History is empty.</div>'}
        </div>
      </aside>
    </div>
  `;
};

const renderDocumentToolbar = (
  state: VisualAidState,
  current: VisualAidState["session"]["items"][number],
  selectedWorkspaceId: string | null,
) => {
  const historyOpen = state.historyOpen === true;

  return `
    <header class="document-toolbar">
      <div class="document-toolbar__start">
        ${renderWorkspaceTabs(state.workspaceState, selectedWorkspaceId)}
      </div>
      <div class="document-toolbar__center">
        <div class="document-toolbar__title-row">
          <h2 class="document-toolbar__title">${escapeHtml(current.title ?? "Untitled Payload")}</h2>
          <span class="format-chip">${escapeHtml(formatLabels[current.format])}</span>
        </div>
      </div>
      <div class="document-toolbar__end">
        <button
          class="history-toggle${historyOpen ? " history-toggle--active" : ""}"
          type="button"
          data-history-toggle
          aria-expanded="${historyOpen ? "true" : "false"}"
          aria-controls="history-sheet"
        >
          <span>Recents</span>
          <span class="history-toggle__count">${state.session.items.length}</span>
        </button>
      </div>
    </header>
  `;
};

const renderSplash = (status: string) => `
  <main class="splash-layout">
    <section class="splash" aria-label="Welcome">
      <div class="splash__content">
        <p class="eyebrow">Agent Visualization Surface</p>
        <h1>${appDisplayName}</h1>
        <p class="splash__lead">A polished surface for inspecting structured agent output.</p>
        <p class="splash__copy">
          Start by sending a <code>visual-aid.show</code> payload. Markdown, code, JSON,
          unified diff, Mermaid, and HTML payloads all render in place once content arrives.
        </p>
        <div class="splash__formats" aria-label="Supported payloads">
          <span class="splash__format">Markdown</span>
          <span class="splash__format">Source Code</span>
          <span class="splash__format">JSON</span>
          <span class="splash__format">Unified Diff</span>
          <span class="splash__format">Mermaid</span>
          <span class="splash__format">HTML</span>
        </div>
      </div>
      <div class="splash__aside">
        <section class="splash-card">
          <p class="panel__label">Status</p>
          <h2>${escapeHtml(status)}</h2>
          <p>Waiting for the first payload in this workspace.</p>
        </section>
        <section class="splash-card">
          <p class="panel__label">Session Flow</p>
          <h2>Replace or Append</h2>
          <p>Replace refreshes the main view. Append preserves a navigable history for review.</p>
        </section>
      </div>
    </section>
  </main>
`;

export const renderAppHtml = (state: VisualAidState) => {
  const selectedWorkspaceId =
    state.selectedWorkspaceId ??
    state.workspaceState?.activeWorkspaceId ??
    null;
  const selectedIndex = resolveSelectedIndex(
    state.session,
    state.selectedIndex,
  );
  const current =
    selectedIndex === null
      ? null
      : (state.session.items[selectedIndex] ?? null);

  return `
    <div class="shell${current ? " shell--document" : " shell--splash"}${
      current?.format === "html" ? " shell--document-html" : ""
    }">
      ${
        current
          ? `
            <div class="app-frame">
              ${renderDocumentToolbar(state, current, selectedWorkspaceId)}
              ${renderHistorySheet(state.session, selectedIndex, state.historyOpen === true)}
              <main class="document-stage">
                <section class="viewer-surface${
                  current.format === "html" ? " viewer-surface--html" : ""
                }" aria-label="Current payload">
                  ${renderContent(current)}
                </section>
              </main>
            </div>
          `
          : renderSplash(state.status)
      }
    </div>
  `;
};

export const renderInto = (target: HTMLElement, state: VisualAidState) => {
  cleanupRenderEffects(target);
  target.innerHTML = renderAppHtml(state);
  hydrateHtmlPayloads(target);
  void hydrateMermaidPayloads(target).catch((error) => {
    console.error("Failed to hydrate Mermaid payloads:", error);
  });
};
