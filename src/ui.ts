type VisualAidFormat = "markdown" | "diff" | "mermaid" | "excalidraw" | "html";
type VisualAidMode = "replace" | "append";

type VisualAidPayload = {
  version: 1;
  format: VisualAidFormat;
  content: string;
  id?: string;
  title?: string;
  summary?: string;
  mode?: VisualAidMode;
  metadata?: Record<string, unknown>;
};

type VisualAidState = {
  items: VisualAidPayload[];
  status: string;
};

declare global {
  interface Window {
    __VISUAL_AID_BOOTSTRAP__?: VisualAidPayload;
    __VISUAL_AID__?: {
      show: (payload: VisualAidPayload) => void;
      clear: () => void;
    };
  }
}

const samplePayload: VisualAidPayload = {
  version: 1,
  format: "markdown",
  title: "Scaffold Ready",
  summary: "The app shell is running and waiting for MCP payloads.",
  content: [
    "# visual-aid",
    "",
    "The renderer shell is ready for structured payloads.",
    "",
    "- format: markdown",
    "- source: scaffold bootstrap",
    "- next step: wire the MCP transport into the desktop host",
  ].join("\n"),
  metadata: {
    source: "bootstrap",
  },
};

const formatLabels: Record<VisualAidFormat, string> = {
  markdown: "Markdown",
  diff: "Unified Diff",
  mermaid: "Mermaid",
  excalidraw: "Excalidraw",
  html: "HTML",
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const renderContent = (payload: VisualAidPayload) => {
  if (payload.format === "html") {
    return `<div class="payload-html">${payload.content}</div>`;
  }

  return `<pre class="payload-pre"><code>${escapeHtml(payload.content)}</code></pre>`;
};

const renderMetadata = (payload: VisualAidPayload) => {
  if (!payload.metadata || Object.keys(payload.metadata).length === 0) {
    return '<p class="metadata-empty">No metadata supplied.</p>';
  }

  return `<pre class="payload-pre payload-pre--meta"><code>${escapeHtml(
    JSON.stringify(payload.metadata, null, 2),
  )}</code></pre>`;
};

const render = (target: HTMLElement, state: VisualAidState) => {
  const current = state.items.at(-1);
  const history = state.items
    .slice()
    .reverse()
    .map((item, index) => {
      const title = item.title ?? `${formatLabels[item.format]} payload`;

      return `
        <button class="history-item${index === 0 ? " history-item--active" : ""}" type="button" disabled>
          <span class="history-item__title">${escapeHtml(title)}</span>
          <span class="history-item__meta">${escapeHtml(item.format)}</span>
        </button>
      `;
    })
    .join("");

  target.innerHTML = `
    <div class="shell">
      <header class="hero">
        <div>
          <p class="eyebrow">Agent Visualization Surface</p>
          <h1>visual-aid</h1>
          <p class="hero__copy">
            A desktop surface for structured agent output. The scaffold currently renders the latest payload and keeps a lightweight in-memory history.
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
                <h2>${state.items.length} item${state.items.length === 1 ? "" : "s"}</h2>
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

const isPayload = (value: unknown): value is VisualAidPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    payload.version === 1 &&
    typeof payload.format === "string" &&
    typeof payload.content === "string"
  );
};

export const bootstrapApp = (target: Element | null) => {
  if (!(target instanceof HTMLElement)) {
    throw new Error("Expected #app root element to exist.");
  }

  const state: VisualAidState = {
    items: [window.__VISUAL_AID_BOOTSTRAP__ ?? samplePayload],
    status: "Renderer shell ready",
  };

  const show = (payload: VisualAidPayload) => {
    state.items = payload.mode === "append" ? [...state.items, payload] : [payload];
    state.status = `Received ${formatLabels[payload.format]} payload`;
    render(target, state);
  };

  const clear = () => {
    state.items = [];
    state.status = "Cleared";
    render(target, state);
  };

  window.__VISUAL_AID__ = { show, clear };

  window.addEventListener("visual-aid:show", (event) => {
    if (!(event instanceof CustomEvent) || !isPayload(event.detail)) {
      return;
    }

    show(event.detail);
  });

  window.addEventListener("visual-aid:clear", () => {
    clear();
  });

  render(target, state);
};
