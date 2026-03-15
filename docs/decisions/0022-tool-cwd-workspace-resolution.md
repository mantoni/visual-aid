# 0022: Tool Cwd Workspace Resolution

## Status

Accepted

## Context

[0021-client-roots-workspace-resolution.md](0021-client-roots-workspace-resolution.md)
used the MCP `roots/list` API as a fallback when the server process cwd did not
match the target workspace.

That matched the MCP protocol better than guessing from shell variables, but it
added complexity to a basic routing problem and still depended on a host
capability that was not consistently exposed in practice.

The server now has a simpler and more direct escape hatch: the caller can pass a
workspace path explicitly with each tool call.

## Decision

Workspace resolution now has three inputs, in this order:

- a tool `cwd` argument, when the caller wants to target a specific workspace
- `VISUAL_AID_WORKSPACE_CWD`, when an explicit environment override is needed
- `process.cwd()` for all normal runs

The MCP server no longer derives workspace identity from the MCP `roots/list`
API.

Shell cwd environment variables such as `PWD` and `INIT_CWD` remain ignored.

## Consequences

Positive consequences:

- workspace routing is explicit at the tool boundary when the caller cares about
  a workspace other than the launcher cwd
- server behavior is easier to debug because it no longer depends on MCP roots
  support from the host
- the main tool flow works even when the launcher starts the server from `/`

Costs and constraints:

- callers that want a workspace other than `process.cwd()` must pass `cwd` or
  set `VISUAL_AID_WORKSPACE_CWD`
- the `visual-aid://status` resource has no per-call arguments, so it still
  reflects only the environment override or the server process cwd
