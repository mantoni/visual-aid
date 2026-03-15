# Spec 0012: Cross-Workspace Source Testing

## Purpose

Define how a `visual-aid` source checkout can serve MCP traffic for another workspace during local testing without per-workspace MCP config changes.

Related decisions:

- [0014-single-window-workspace-tabs.md](../decisions/0014-single-window-workspace-tabs.md)
- [0018-source-checkout-cross-workspace-testing.md](../decisions/0018-source-checkout-cross-workspace-testing.md)

## Preconditions

- The `visual-aid` source checkout remains the place where the MCP server code runs from.
- Another local workspace wants to use that source checkout for testing.
- The desktop app and MCP server still communicate through a shared session file.

## Invariants

- The source checkout and the target workspace may differ.
- Workspace identity in the registry follows the target workspace, not the source checkout.
- Cross-workspace source testing keeps the same shared registry model and single-window workspace tabs.
- A generic MCP config may point at this checkout's server entrypoint while the server process cwd determines the active workspace.
- Client roots and shell cwd environment variables do not change workspace identity unless an explicit workspace override is configured.

## Scenarios

### VXT-WORKSPACE-001 Workspace cwd honors the explicit environment override

Given the MCP server process runs from the `visual-aid` source checkout
When `VISUAL_AID_WORKSPACE_CWD` is set to another workspace path
Then workspace identity resolves to that override path

### VXT-WORKSPACE-002 Workspace overrides attribute registry updates to the target project

Given the MCP server process runs from the `visual-aid` source checkout
And `VISUAL_AID_WORKSPACE_CWD` points at another workspace path
When `visual-aid.show` records a payload
Then the workspace registry stores that target workspace path as the active workspace
And the workspace label is derived from the target workspace path

### VXT-WORKSPACE-003 Generic source-checkout config uses the caller cwd as the workspace

Given Codex starts this checkout's MCP server entrypoint from another project cwd
And no explicit session or workspace override is configured
When `visual-aid.show` records a payload
Then that caller cwd becomes the active workspace
And the session is written under that caller cwd

### VXT-WORKSPACE-004 Root launcher cwd ignores shell cwd fallbacks

Given Codex starts this checkout's MCP server entrypoint from `/`
And `PWD` or `INIT_CWD` points at another project
And no explicit session or workspace override is configured
When `visual-aid.show` records a payload
Then `/` remains the active workspace
And shell cwd environment variables do not change the selected workspace

### VXT-WORKSPACE-005 Client roots do not override the process cwd

Given the MCP server runs from the `visual-aid` source checkout
And the MCP client exposes another workspace as its active file root
When `visual-aid.show` records a payload
Then the server process cwd remains the active workspace
And client roots do not change the selected workspace

## Test Mapping

- `tests/mcp/workspace.test.ts`: `VXT-WORKSPACE-001`, `VXT-WORKSPACE-004`
- `tests/mcp/integration.test.ts`: `VXT-WORKSPACE-002`, `VXT-WORKSPACE-003`, `VXT-WORKSPACE-004`, `VXT-WORKSPACE-005`
