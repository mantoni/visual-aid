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

- `npm start` keeps the repository-local `.visual-aid/dev-session.json` as the default dogfood session when no override is provided
- `npm start` accepts `--workspace-cwd` to target another workspace while still launching `tauri:dev` from the `visual-aid` checkout
- `npm start -- --print-codex-config --workspace-cwd <path>` prints a config block that keeps `cwd` on the `visual-aid` checkout while setting `VISUAL_AID_SESSION_PATH` and `VISUAL_AID_WORKSPACE_CWD` for the target workspace
- the MCP server resolves workspace identity from `VISUAL_AID_WORKSPACE_CWD` when present
- source-checkout configs may set `VISUAL_AID_PREFER_DEBUG_APP=1` so launch discovery keeps preferring the local debug build even when the session path is not the canonical dogfood path

## Consequences

Positive consequences:

- contributors can test `visual-aid` from another project without copying the server code into that project
- workspace tabs and registry state reflect the target project instead of the `visual-aid` repo
- the default repository-local dogfood path stays intact

Costs and constraints:

- the startup and config flow grows an explicit second mode
- source-checkout integrations now rely on one extra workspace override variable for accurate project identity
