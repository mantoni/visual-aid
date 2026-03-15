# 0019: Process Cwd Workspace Resolution

## Status

Superseded by [0022-tool-cwd-workspace-resolution.md](0022-tool-cwd-workspace-resolution.md)

## Context

[0018-source-checkout-cross-workspace-testing.md](0018-source-checkout-cross-workspace-testing.md) expanded workspace resolution beyond the server process cwd.

This record is preserved for historical context only. The current workspace
resolution behavior is defined by
[0022-tool-cwd-workspace-resolution.md](0022-tool-cwd-workspace-resolution.md).

That added support for:

- MCP client roots
- shell cwd fallbacks through `PWD` and `INIT_CWD`

In practice, that extra recovery logic makes workspace routing harder to reason about and debug. The MCP server still derives its default session path from the resolved workspace cwd, so hidden fallbacks can point writes at an unexpected workspace when the launcher is misconfigured.

## Decision

Workspace resolution now has only two inputs:

- `VISUAL_AID_WORKSPACE_CWD`, when an explicit override is needed
- `process.cwd()`, for all normal runs

The MCP server no longer derives workspace identity from MCP client roots, `PWD`, or `INIT_CWD`.

The generic Codex config continues to rely on the launcher starting the MCP server from the correct project cwd.

`VISUAL_AID_WORKSPACE_CWD` remains available for manual testing and targeted override scenarios.

## Consequences

Positive consequences:

- workspace routing is simpler and easier to inspect
- the default session path always follows the same cwd that launched the server unless an explicit override is set
- debugging incorrect writes no longer depends on hidden fallback state

Costs and constraints:

- launchers that start the server from the wrong cwd must be fixed
- if a caller intentionally targets a workspace other than `process.cwd()`, it must set `VISUAL_AID_WORKSPACE_CWD` explicitly
