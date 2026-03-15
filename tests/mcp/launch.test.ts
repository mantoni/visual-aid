import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { detectLaunchTarget } from "../../mcp/launch.js";

const tempRoots: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");

  await Promise.all(
    tempRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

describe("MCP launch spec", () => {
  it("VAS-LAUNCH-001 environment command takes priority over auto-detection", async () => {
    const root = join(
      process.cwd(),
      ".tmp-tests",
      `launch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    tempRoots.push(root);

    await mkdir(
      join(
        root,
        "src-tauri",
        "target",
        "release",
        "bundle",
        "macos",
        "visual-aid.app",
      ),
      { recursive: true },
    );

    const target = await detectLaunchTarget(root, {
      VISUAL_AID_OPEN_COMMAND: "open -a visual-aid",
    });

    expect(target).toEqual({
      kind: "command",
      value: "open -a visual-aid",
      source: "VISUAL_AID_OPEN_COMMAND",
    });
  });

  it("VAS-LAUNCH-002 canonical dogfood sessions prefer the debug app target", async () => {
    const root = join(
      process.cwd(),
      ".tmp-tests",
      `launch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    tempRoots.push(root);

    await mkdir(
      join(
        root,
        "src-tauri",
        "target",
        "release",
        "bundle",
        "macos",
        "visual-aid.app",
      ),
      { recursive: true },
    );
    await mkdir(join(root, "src-tauri", "target", "debug"), { recursive: true });
    const { writeFile } = await import("node:fs/promises");
    await writeFile(join(root, "src-tauri", "target", "debug", "visual-aid"), "");

    const target = await detectLaunchTarget(root, {
      VISUAL_AID_SESSION_PATH: join(root, ".visual-aid", "dev-session.json"),
    });

    expect(target).toEqual({
      kind: "binary",
      value: join(root, "src-tauri", "target", "debug", "visual-aid"),
      source: "detected debug binary",
    });
  });

  it("VAS-LAUNCH-003 explicit app bundle paths take priority over auto-detection", async () => {
    const root = join(
      process.cwd(),
      ".tmp-tests",
      `launch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    tempRoots.push(root);

    await mkdir(
      join(
        root,
        "src-tauri",
        "target",
        "release",
        "bundle",
        "macos",
        "visual-aid.app",
      ),
      { recursive: true },
    );

    const explicitBundlePath = "/Applications/visual-aid.app";
    const target = await detectLaunchTarget(root, {
      VISUAL_AID_APP_PATH: explicitBundlePath,
    });

    expect(target).toEqual({
      kind: "bundle",
      value: explicitBundlePath,
      source: "VISUAL_AID_APP_PATH",
    });
  });
});
