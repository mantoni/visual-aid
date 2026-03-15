# 0021: Client Roots Workspace Resolution

## Status

Superseded by [0022-tool-cwd-workspace-resolution.md](0022-tool-cwd-workspace-resolution.md)

This record is preserved for historical context only. The current workspace
resolution behavior is defined by
[0022-tool-cwd-workspace-resolution.md](0022-tool-cwd-workspace-resolution.md).

## Context

[0019-process-cwd-workspace-resolution.md](0019-process-cwd-workspace-resolution.md)
reduced workspace routing to explicit overrides plus `process.cwd()`.

That simplification made the behavior easy to describe, but it breaks down when an
MCP host launches the server from a generic directory such as `/` while still
knowing the active project through the MCP roots API. In that situation the server
tries to read and write `/.visual-aid/session.json`, which is the wrong workspace
and can fail outright.

The client already has a standard way to describe the current project. The server
should use that signal before falling back to its own launch directory.

## Decision

Workspace resolution now has three inputs, in this order:

- `VISUAL_AID_WORKSPACE_CWD`, when an explicit override is needed
- the first usable file-based root returned by the MCP `roots/list` API
- `process.cwd()` when no explicit override or usable client root is available

Shell cwd environment variables such as `PWD` and `INIT_CWD` remain ignored.

The generic Codex config may still point at this checkout's server entrypoint
without pinning a workspace-specific cwd. When the host exposes the active project
through MCP roots, `visual-aid` should attribute the session to that project.

## Consequences

Positive consequences:

- generic launchers no longer route writes to `/.visual-aid` when the active
  project is available through MCP roots
- cross-workspace testing works even when the server process cwd is not the caller
  workspace
- explicit overrides still provide a deterministic escape hatch for manual testing

Costs and constraints:

- workspace resolution again depends on a client capability, so fallback behavior
  must stay well-tested when roots are unavailable
- when multiple roots are exposed, the server currently trusts the first usable
  file-based root
