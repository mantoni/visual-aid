import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  new URL("../../src/styles.css", import.meta.url),
  "utf8",
);

describe("Renderer stylesheet spec", () => {
  it("VAR-LAYOUT-003 narrow-screen toolbar rules keep recents on the top row", () => {
    expect(stylesheet).toContain('@media (max-width: 1100px) {\n  .shell--document {\n    --document-toolbar-height: 96px;\n  }\n\n  .document-toolbar {\n    grid-template-columns: minmax(0, 1fr) auto;');
    expect(stylesheet).toContain('grid-template-areas:\n      "start end"\n      "center center";');
    expect(stylesheet).toContain(".document-toolbar__end {\n    justify-content: flex-end;\n  }");
    expect(stylesheet).toContain(".history-toggle {\n    width: auto;\n    justify-content: flex-end;\n  }");
  });

  it("VAR-LAYOUT-004 the recents sheet reuses the toolbar glass styling", () => {
    expect(stylesheet).toContain("--document-glass-bg: rgba(12, 18, 27, 0.68);");
    expect(stylesheet).toContain(
      "--document-glass-backdrop: saturate(1.35) blur(18px);",
    );
    expect(stylesheet).toContain("background: var(--document-glass-bg);");
    expect(stylesheet).toContain(
      "backdrop-filter: var(--document-glass-backdrop);",
    );
    expect(stylesheet).toContain(
      "-webkit-backdrop-filter: var(--document-glass-backdrop);",
    );
  });
});
