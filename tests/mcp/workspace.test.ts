import { describe, expect, it } from "vitest";

import {
  applyWorkspaceSession,
  emptyWorkspaceRegistryState,
  resolveRegistryPath,
  resolveWorkspace,
  resolveWorkspaceCwd,
} from "../../mcp/workspace.js";

describe("MCP workspace registry", () => {
  it("VWT-BRIDGE-001 workspace updates append a new active workspace entry", () => {
    const next = applyWorkspaceSession(
      emptyWorkspaceRegistryState(),
      "/tmp/project-one",
      "/tmp/project-one/.visual-aid/session.json",
    );

    expect(next.activeWorkspaceId).toBe("/tmp/project-one");
    expect(next.workspaces).toHaveLength(1);
    expect(next.workspaces[0]?.label).toBe("project-one");
  });

  it("VXT-WORKSPACE-006 registry entries store workspace references without embedded session payloads", () => {
    const initial = applyWorkspaceSession(
      emptyWorkspaceRegistryState(),
      "/tmp/project-one",
      "/tmp/project-one/.visual-aid/session.json",
    );

    const next = applyWorkspaceSession(
      initial,
      "/tmp/project-one",
      "/tmp/project-one/.visual-aid/session.json",
    );

    expect(next.workspaces).toHaveLength(1);
    expect(next.workspaces[0]).toEqual({
      id: "/tmp/project-one",
      cwd: "/tmp/project-one",
      label: "project-one",
      sessionPath: "/tmp/project-one/.visual-aid/session.json",
    });
  });

  it("VWT-BRIDGE-001 registry path honors the explicit environment override", () => {
    expect(
      resolveRegistryPath("/tmp/project-one", {
        VISUAL_AID_REGISTRY_PATH: "/tmp/visual-aid-registry.json",
      }),
    ).toBe("/tmp/visual-aid-registry.json");
  });

  it("VXT-WORKSPACE-001 workspace cwd honors the explicit environment override", () => {
    return expect(
      resolveWorkspaceCwd("/tmp/visual-aid", {
        VISUAL_AID_WORKSPACE_CWD: "/tmp/project-one",
      }),
    ).resolves.toBe("/tmp/project-one");
  });

  it("VXT-WORKSPACE-004 workspace cwd ignores shell cwd fallbacks when the launcher cwd is root", () => {
    return expect(
      resolveWorkspaceCwd("/", {
        PWD: "/tmp/project-one",
        INIT_CWD: "/tmp/project-two",
      }),
    ).resolves.toBe("/");
  });

  it("VXT-WORKSPACE-003 workspace cwd falls back to the launcher cwd by default", () => {
    return expect(resolveWorkspaceCwd("/tmp/visual-aid", {})).resolves.toBe(
      "/tmp/visual-aid",
    );
  });

  it("VXT-WORKSPACE-003 workspace diagnostics report process cwd as the resolution source", () => {
    return expect(resolveWorkspace("/tmp/visual-aid", {})).resolves.toEqual({
      cwd: "/tmp/visual-aid",
      source: "process-cwd",
    });
  });
});
