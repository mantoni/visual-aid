# 0007: Npm Start Canonical Dogfood Entrypoint

## Status

Accepted

Extended by [0018-source-checkout-cross-workspace-testing.md](0018-source-checkout-cross-workspace-testing.md).

## Context

The repository already has the pieces needed for local dogfooding:

- a Tauri development app entrypoint
- an MCP server over stdio
- a file-based session bridge

What it does not yet have is a single canonical local startup flow that a future agent session can recover quickly from markdown alone. The current lower-level workflow makes the session path and startup ordering too easy to vary between runs.

## Decision

`npm start` becomes the canonical local dogfood entrypoint for this repository.

Specifically:

- `npm start` without overrides creates or reuses `.visual-aid/dev-session.json`
- `npm start` launches `npm run tauri:dev` with `VISUAL_AID_SESSION_PATH` set to the canonical dogfood session path
- `npm start` may print the exact Codex MCP config block for the current checkout
- Codex `config.toml` remains responsible for starting `npx tsx mcp/server.ts`
- `npm start` does not launch a competing local MCP server process

If a non-Codex local workflow later needs to launch both the app and the MCP server together, that should be added as a separate command rather than broadening `npm start`.

## Consequences

Positive consequences:

- local dogfooding has one documented entrypoint
- the app and the Codex MCP server share a predictable session file
- agent handoff becomes simpler because the startup expectations are explicit

Costs and constraints:

- manual testing outside Codex still needs an explicit `npx tsx mcp/server.ts` command
- the canonical dogfood path is intentionally narrower than all possible local workflows
- future dual-process helpers should avoid redefining the meaning of `npm start`
