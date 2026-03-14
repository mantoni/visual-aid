type MermaidRenderResult = {
  svg: string;
  bindFunctions?: (element: Element) => void;
};

type MermaidRenderer = {
  initialize: (options: Record<string, unknown>) => void;
  render: (id: string, source: string) => Promise<MermaidRenderResult>;
};

type MermaidModule = {
  default?: MermaidRenderer;
} & Partial<MermaidRenderer>;

type MermaidHydrationOptions = {
  loadRenderer?: () => Promise<MermaidRenderer>;
};

let rendererPromise: Promise<MermaidRenderer> | null = null;
let initialized = false;
let renderSequence = 0;

const resolveRenderer = (module: MermaidModule): MermaidRenderer => {
  const renderer = module.default ?? module;

  if (
    typeof renderer.initialize !== "function" ||
    typeof renderer.render !== "function"
  ) {
    throw new Error("Mermaid renderer module is missing required methods.");
  }

  return {
    initialize: renderer.initialize.bind(renderer),
    render: renderer.render.bind(renderer),
  };
};

export const loadMermaidRenderer = async (): Promise<MermaidRenderer> => {
  if (!rendererPromise) {
    rendererPromise = import("mermaid").then((module) =>
      resolveRenderer(module as MermaidModule),
    );
  }

  return rendererPromise;
};

const getRenderer = async (
  loadRenderer: () => Promise<MermaidRenderer>,
): Promise<MermaidRenderer> => {
  const renderer = await loadRenderer();

  if (!initialized) {
    renderer.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
    });
    initialized = true;
  }

  return renderer;
};

const setFallbackState = (payload: HTMLElement, message: string) => {
  const diagram = payload.querySelector<HTMLElement>("[data-mermaid-diagram]");
  const error = payload.querySelector<HTMLElement>("[data-mermaid-error]");
  const status = payload.querySelector<HTMLElement>("[data-mermaid-status]");
  const details = payload.querySelector<HTMLDetailsElement>(
    "[data-mermaid-source-panel]",
  );

  if (diagram) {
    diagram.innerHTML = "";
  }

  if (status) {
    status.textContent = "Source preview";
  }

  if (error) {
    error.hidden = false;
    error.textContent = message;
  }

  if (details) {
    details.open = true;
  }
};

const hydratePayload = async (
  payload: HTMLElement,
  renderer: MermaidRenderer,
) => {
  const diagram = payload.querySelector<HTMLElement>("[data-mermaid-diagram]");
  const source = payload.querySelector<HTMLElement>("[data-mermaid-source-code]");
  const status = payload.querySelector<HTMLElement>("[data-mermaid-status]");
  const error = payload.querySelector<HTMLElement>("[data-mermaid-error]");
  const details = payload.querySelector<HTMLDetailsElement>(
    "[data-mermaid-source-panel]",
  );

  if (!diagram || !source) {
    return;
  }

  if (status) {
    status.textContent = "Rendering diagram";
  }

  if (error) {
    error.hidden = true;
    error.textContent = "";
  }

  const renderId = `visual-aid-mermaid-${renderSequence++}`;

  try {
    const result = await renderer.render(renderId, source.textContent ?? "");

    if (!payload.isConnected) {
      return;
    }

    diagram.innerHTML = result.svg;
    result.bindFunctions?.(diagram);

    if (status) {
      status.textContent = "Rendered diagram";
    }

    if (details) {
      details.open = false;
    }
  } catch {
    if (!payload.isConnected) {
      return;
    }

    setFallbackState(
      payload,
      "Diagram rendering failed. Showing Mermaid source instead.",
    );
  }
};

export const hydrateMermaidPayloads = async (
  root: ParentNode,
  options?: MermaidHydrationOptions,
) => {
  const payloads = Array.from(
    root.querySelectorAll<HTMLElement>(".payload-mermaid"),
  );

  if (payloads.length === 0) {
    return;
  }

  const loadRenderer = options?.loadRenderer ?? loadMermaidRenderer;

  let renderer: MermaidRenderer;
  try {
    renderer = await getRenderer(loadRenderer);
  } catch {
    for (const payload of payloads) {
      setFallbackState(
        payload,
        "Diagram rendering is unavailable. Showing Mermaid source instead.",
      );
    }
    return;
  }

  await Promise.all(payloads.map((payload) => hydratePayload(payload, renderer)));
};

export const resetMermaidRendererForTests = () => {
  rendererPromise = null;
  initialized = false;
  renderSequence = 0;
};
