# 0018: Source Checkout Cross-Workspace Testing

## Status

Accepted

## Context

`npm start` and the printed Codex config currently assume the `visual-aid` source checkout is both:

- the place where the MCP server code lives
- the workspace identity that should appear in the app

That is fine for repository-local dogfooding, but it is too rigid when a contributor wants to keep iterating on `visual-aid` while temporarily using that same source checkout from another local project.

## Decision

The source checkout and the target workspace are now treated as separate concerns.

Specifically:

- `npm start` keeps the repository-local `.visual-aid/dev-session.json` as the default local app session for source-checkout dogfooding
- `npm start -- --print-codex-config` prints a generic config block that points at this checkout's MCP server entrypoint by absolute path
- the generic config intentionally does not pin `cwd` or `VISUAL_AID_SESSION_PATH`, so the caller workspace becomes the active workspace automatically
- the MCP server resolves workspace identity from explicit overrides first, then from client roots when available, then from process and shell cwd fallbacks
- source-checkout configs may set `VISUAL_AID_PREFER_DEBUG_APP=1` so launch discovery keeps preferring the local debug build

## Consequences

Positive consequences:

- contributors can test `visual-aid` from another project without copying the server code into that project
- workspace tabs and registry state reflect the caller project instead of the `visual-aid` repo
- the default repository-local dogfood path stays intact
- one Codex MCP config can be reused across projects

Costs and constraints:

- launchers that clear the process cwd and shell cwd environment and do not expose client roots still need an explicit `VISUAL_AID_WORKSPACE_CWD` override
