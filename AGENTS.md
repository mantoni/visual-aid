# AGENTS.md

## Purpose
`visual-aid` is a Tauri desktop app plus MCP server that lets coding agents present structured content in a dedicated visual surface instead of plain terminal output.

The repository is intentionally optimized for agent-driven work. Markdown documents are part of the operating system of the project, not optional background material.

## First Read
Before making substantial changes, read the documents that define the current direction:

- [README.md](/Users/max/projects/mantoni/visual-aid/README.md)
- [docs/agent-workflow.md](/Users/max/projects/mantoni/visual-aid/docs/agent-workflow.md)
- [docs/product.md](/Users/max/projects/mantoni/visual-aid/docs/product.md)
- [docs/architecture.md](/Users/max/projects/mantoni/visual-aid/docs/architecture.md)
- [docs/specs/README.md](/Users/max/projects/mantoni/visual-aid/docs/specs/README.md)
- [docs/decisions/README.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/README.md)

Then read only the specific spec and decision files relevant to the task.

## System Map
- `src/`: Vite-based TypeScript renderer UI.
- `mcp/`: Node-based MCP server, payload validation, launch logic, and session persistence.
- `src-tauri/`: Tauri v2 Rust host.
- `scripts/start.ts`: canonical local dogfood entrypoint.
- `tests/`: Vitest coverage for UI, MCP, bridge, and scripts.
- `.visual-aid/`: local session files created during dogfooding.

## Working Rules
- Keep implementation aligned with the docs. If the intended behavior changes, update docs in the same change.
- Prefer updating an existing document over creating a parallel source of truth.
- Record meaningful architecture, workflow, renderer, payload, or MCP contract changes in `docs/decisions/`.
- For any new externally visible behavior, add or update a spec in `docs/specs/` and add or update automated tests in the same change.
- Keep specs behavioral. Do not document internal implementation details as acceptance criteria.
- Test names should include the matching scenario ID from the relevant spec.
- Open markdown resources in `visual-aid` when they are part of the task context and help the user inspect repo state.
- Send resource-oriented output or extra meta-information through `visual-aid` when that richer surface is useful, while keeping terminal replies concise.

## Development Flow
The canonical local workflow is the dogfood path described in [docs/dogfooding.md](/Users/max/projects/mantoni/visual-aid/docs/dogfooding.md).

Use these commands by default:

- `npm start`: create or reuse `.visual-aid/dev-session.json` and launch the Tauri app in dev mode.
- `npm start -- --print-codex-config`: print the matching Codex MCP config for the current checkout.
- `npm run check`: TypeScript type-check.
- `npm test`: run Vitest.
- `npm run build`: build the frontend bundle.
- `npm run verify`: run check, test, and build together.
- `npm run tauri:build`: build the desktop app bundle when packaging work matters.

Prefer `npm start` over manually reproducing the dogfood setup unless the task specifically requires lower-level debugging.

## Validation Bar
Before handing off work, run the smallest relevant validation that gives real confidence, then widen to `npm run verify` when the change touches multiple layers or workflow-critical paths.

Minimum expectations:

- UI/renderer changes: relevant `tests/ui/*` coverage, plus manual dogfood verification when practical.
- MCP/session/launch changes: relevant `tests/mcp/*`, `tests/bridge/*`, or `tests/scripts/*` coverage.
- Workflow or contract changes: update docs, specs, and tests together.

If you could not run an important check, say so explicitly in the handoff.

## Documentation Policy
- Treat markdown as durable project memory for the next agent session.
- Keep the README document map accurate when adding or removing important docs.
- When a decision supersedes an earlier document, update both the decision record and the stale document in the same change.
- Write short, direct sections and make assumptions explicit when the user has not decided something yet.

## Non-Goals
- Do not move fast by creating undocumented behavior.
- Do not add heavyweight renderer dependencies or new payload formats without updating the relevant specs and decisions first.
- Do not bypass the documented dogfood workflow without a task-specific reason.
