import { describe, expect, it } from "vitest";

import { emptySession } from "../../mcp/session.js";
import {
  applyWorkspaceSession,
  emptyWorkspaceState,
  resolveRegistryPath,
  resolveWorkspaceCwd,
} from "../../mcp/workspace.js";

describe("MCP workspace registry", () => {
  it("VWT-BRIDGE-001 workspace updates append a new active workspace entry", () => {
    const next = applyWorkspaceSession(
      emptyWorkspaceState(),
      "/tmp/project-one",
      "/tmp/project-one/.visual-aid/session.json",
      {
        ...emptySession(),
        lastAction: "show",
        items: [
          {
            version: 1,
            format: "markdown",
            content: "# One",
          },
        ],
      },
    );

    expect(next.activeWorkspaceId).toBe("/tmp/project-one");
    expect(next.workspaces).toHaveLength(1);
    expect(next.workspaces[0]?.label).toBe("project-one");
  });

  it("VWT-BRIDGE-001 workspace updates replace an existing workspace in place", () => {
    const initial = applyWorkspaceSession(
      emptyWorkspaceState(),
      "/tmp/project-one",
      "/tmp/project-one/.visual-aid/session.json",
      {
        ...emptySession(),
        lastAction: "show",
        items: [
          {
            version: 1,
            format: "markdown",
            content: "# Draft",
          },
        ],
      },
    );

    const next = applyWorkspaceSession(
      initial,
      "/tmp/project-one",
      "/tmp/project-one/.visual-aid/session.json",
      {
        ...emptySession(),
        lastAction: "show",
        items: [
          {
            version: 1,
            format: "html",
            content: "<article>Updated</article>",
          },
        ],
      },
    );

    expect(next.workspaces).toHaveLength(1);
    expect(next.workspaces[0]?.session.items[0]?.format).toBe("html");
  });

  it("VWT-BRIDGE-001 registry path honors the explicit environment override", () => {
    expect(
      resolveRegistryPath("/tmp/project-one", {
        VISUAL_AID_REGISTRY_PATH: "/tmp/visual-aid-registry.json",
      }),
    ).toBe("/tmp/visual-aid-registry.json");
  });

  it("VXT-WORKSPACE-001 workspace cwd honors the explicit environment override", () => {
    expect(
      resolveWorkspaceCwd("/tmp/visual-aid", {
        VISUAL_AID_WORKSPACE_CWD: "/tmp/project-one",
      }),
    ).toBe("/tmp/project-one");
  });

  it("VXT-WORKSPACE-004 workspace cwd ignores shell cwd fallbacks when the launcher cwd is root", () => {
    expect(
      resolveWorkspaceCwd("/", {
        PWD: "/tmp/project-one",
        INIT_CWD: "/tmp/project-two",
      }),
    ).toBe("/");
  });
});
