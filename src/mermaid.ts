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

type MermaidAppearance = "dark" | "light";
type MermaidInitializeOptions = Record<string, unknown>;

let rendererPromise: Promise<MermaidRenderer> | null = null;
let initialized = false;
let initializedAppearance: MermaidAppearance | null = null;
let renderSequence = 0;
const mermaidFontSizePx = 17;
const mermaidFontSize = `${mermaidFontSizePx}px`;

const darkThemeVariables = {
  background: "#09111a",
  primaryColor: "#f0e7db",
  primaryTextColor: "#09111a",
  primaryBorderColor: "#f0e7db",
  secondaryColor: "#e6edf4",
  secondaryTextColor: "#09111a",
  secondaryBorderColor: "#e6edf4",
  tertiaryColor: "#d7e6f0",
  tertiaryTextColor: "#09111a",
  tertiaryBorderColor: "#d7e6f0",
  lineColor: "#f0e7db",
  arrowheadColor: "#f0e7db",
  textColor: "#f5f1e8",
  mainBkg: "#f0e7db",
  nodeBkg: "#f0e7db",
  nodeTextColor: "#09111a",
  nodeBorder: "#f0e7db",
  clusterBkg: "#0f1824",
  clusterBorder: "#8fd0f4",
  defaultLinkColor: "#f0e7db",
  titleColor: "#f5f1e8",
  edgeLabelBackground: "#09111a",
  labelBackgroundColor: "#09111a",
  labelTextColor: "#f5f1e8",
  actorBkg: "#f0e7db",
  actorTextColor: "#09111a",
  actorBorder: "#f0e7db",
  fontSize: mermaidFontSize,
} as const;

const darkEdgeLabelColor = "#f5f1e8";
const darkEdgeLabelBackground = "rgba(9, 17, 26, 0.82)";

const normalizeRecoverableMermaidSource = (source: string) =>
  source.replace(/\[\(\(([^\]]*?)\)\)\]/g, "[($1)]");

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

const resolveMermaidAppearance = (): MermaidAppearance => {
  const theme =
    document.querySelector("#app")?.getAttribute("data-theme") ??
    document.documentElement.dataset.theme;

  return theme === "dark" ? "dark" : "light";
};

const resolveMermaidConfig = (
  appearance: MermaidAppearance,
): MermaidInitializeOptions => {
  if (appearance === "dark") {
    return {
      startOnLoad: false,
      securityLevel: "strict",
      darkMode: true,
      fontSize: mermaidFontSizePx,
      theme: "base",
      themeVariables: darkThemeVariables,
    };
  }

  return {
    startOnLoad: false,
    securityLevel: "strict",
    fontSize: mermaidFontSizePx,
    theme: "neutral",
    themeVariables: {
      fontSize: mermaidFontSize,
    },
  };
};

const getRenderer = async (
  loadRenderer: () => Promise<MermaidRenderer>,
): Promise<MermaidRenderer> => {
  const renderer = await loadRenderer();
  const appearance = resolveMermaidAppearance();

  if (!initialized || initializedAppearance !== appearance) {
    renderer.initialize(resolveMermaidConfig(appearance));
    initialized = true;
    initializedAppearance = appearance;
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

const applySvgLayout = (diagram: HTMLElement) => {
  const svg = diagram.querySelector<SVGSVGElement>("svg");

  if (!svg) {
    return;
  }

  const svgBounds = typeof svg.getBBox === "function" ? svg.getBBox() : null;
  let svgWidth: number | null = null;
  if (
    svgBounds &&
    Number.isFinite(svgBounds.x) &&
    Number.isFinite(svgBounds.y) &&
    svgBounds.width > 0 &&
    svgBounds.height > 0
  ) {
    const padding = 4;
    svgWidth = svgBounds.width + padding * 2;
    svg.setAttribute(
      "viewBox",
      [
        svgBounds.x - padding,
        svgBounds.y - padding,
        svgBounds.width + padding * 2,
        svgBounds.height + padding * 2,
      ].join(" "),
    );
  }

  if (svgWidth === null) {
    const viewBox = svg.getAttribute("viewBox");
    if (viewBox) {
      const [, , width] = viewBox.split(/[\s,]+/).map(Number);
      if (Number.isFinite(width) && width > 0) {
        svgWidth = width;
      }
    }
  }

  if (svgWidth !== null) {
    const roundedWidth = Math.ceil(svgWidth);
    svg.setAttribute("width", String(roundedWidth));
    svg.style.width = "100%";
    svg.style.minWidth = `${roundedWidth}px`;
  } else {
    svg.setAttribute("width", "100%");
    svg.style.width = "100%";
    svg.style.removeProperty("min-width");
  }

  svg.removeAttribute("height");
  svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
  svg.style.maxWidth = "none";
  svg.style.height = "auto";
};

const applyDarkSvgReadability = (diagram: HTMLElement) => {
  for (const element of diagram.querySelectorAll<HTMLElement>(
    ".edgeLabel .edgeLabel, .edgeLabel span, .edgeLabel div, .edgeLabel text, .edgeLabel tspan, .labelBkg",
  )) {
    element.style.color = darkEdgeLabelColor;
    element.style.fill = darkEdgeLabelColor;
  }

  for (const element of diagram.querySelectorAll<HTMLElement>(".labelBkg")) {
    element.style.backgroundColor = darkEdgeLabelBackground;
  }
};

const applyRenderedDiagramStyling = (
  diagram: HTMLElement,
  appearance: MermaidAppearance,
) => {
  applySvgLayout(diagram);

  if (appearance === "dark") {
    applyDarkSvgReadability(diagram);
  }
};

const hydratePayload = async (
  payload: HTMLElement,
  renderer: MermaidRenderer,
  appearance: MermaidAppearance,
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
  const rawSource = source.textContent ?? "";
  const fallbackSource = normalizeRecoverableMermaidSource(rawSource);

  try {
    const result = await renderer.render(renderId, rawSource);

    if (!payload.isConnected) {
      return;
    }

    diagram.innerHTML = result.svg;
    result.bindFunctions?.(diagram);
    applyRenderedDiagramStyling(diagram, appearance);

    if (status) {
      status.textContent = "Rendered diagram";
    }

    if (details) {
      details.open = false;
    }
  } catch {
    if (fallbackSource !== rawSource) {
      try {
        const result = await renderer.render(renderId, fallbackSource);

        if (!payload.isConnected) {
          return;
        }

        diagram.innerHTML = result.svg;
        result.bindFunctions?.(diagram);
        applyRenderedDiagramStyling(diagram, appearance);

        if (status) {
          status.textContent = "Rendered diagram";
        }

        if (details) {
          details.open = false;
        }

        return;
      } catch {
        if (!payload.isConnected) {
          return;
        }
      }
    } else if (!payload.isConnected) {
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
  const appearance = resolveMermaidAppearance();
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

  await Promise.all(
    payloads.map((payload) => hydratePayload(payload, renderer, appearance)),
  );
};

export const resetMermaidRendererForTests = () => {
  rendererPromise = null;
  initialized = false;
  initializedAppearance = null;
  renderSequence = 0;
};
