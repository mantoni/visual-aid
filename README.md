# visual-aid

## Purpose

`visual-aid` is a Tauri application that gives coding agents a dedicated way to present structured information to users as visual output.

Agents should be able to launch the app and send it structured payloads over MCP. The app then renders those payloads in a form that is easy for a user to inspect and understand.

## What The App Should Support

The visual aid is intended for structured formats such as:

- Markdown
- Unified diff
- Mermaid
- Excalidraw
- HTML

The set of supported formats can grow over time as new agent workflows emerge.

## Core Idea

Instead of forcing every piece of agent-generated content into plain terminal text, this project provides a separate visual surface for content that benefits from richer rendering.

That means an agent can:

1. Launch the visual aid.
2. Send structured data to it through MCP.
3. Let the app render an appropriate visual representation for the user.

## Direction

This project starts as the foundation for an agent-facing visualization tool:

- The agent is the producer of structured content.
- MCP is the communication layer between the agent and the app.
- The Tauri app is the renderer for the user-facing visual representation.

The goal is a simple, reliable path from agent output to a visual experience that helps users understand code, changes, diagrams, and other structured artifacts more clearly.

## Documentation Framework

This project is intended to be built and maintained primarily by a coding agent. To support that workflow, project knowledge should live in markdown files that are easy to inspect, update, and review.

The baseline document set is:

- [docs/agent-workflow.md](/Users/max/projects/mantoni/visual-aid/docs/agent-workflow.md): operating rules for agent-driven work in this repository
- [docs/architecture.md](/Users/max/projects/mantoni/visual-aid/docs/architecture.md): current system shape and technical boundaries
- [docs/dogfooding.md](/Users/max/projects/mantoni/visual-aid/docs/dogfooding.md): canonical local dogfood flow centered on `npm start`
- [docs/product.md](/Users/max/projects/mantoni/visual-aid/docs/product.md): product intent, scope, and milestone direction
- [docs/specs/README.md](/Users/max/projects/mantoni/visual-aid/docs/specs/README.md): behavior-spec convention and test mapping rules
- [docs/specs/0001-mcp-session-flow.md](/Users/max/projects/mantoni/visual-aid/docs/specs/0001-mcp-session-flow.md): initial acceptance spec for `visual-aid.open`, `show`, and `clear`
- [docs/specs/0002-desktop-bridge-and-renderer-state.md](/Users/max/projects/mantoni/visual-aid/docs/specs/0002-desktop-bridge-and-renderer-state.md): polling and renderer-state behavior
- [docs/specs/0003-mcp-stdio-integration.md](/Users/max/projects/mantoni/visual-aid/docs/specs/0003-mcp-stdio-integration.md): end-to-end MCP client/server behavior
- [docs/specs/0004-renderer-output.md](/Users/max/projects/mantoni/visual-aid/docs/specs/0004-renderer-output.md): visible renderer output and layout behavior
- [docs/specs/0005-interactive-ui-behavior.md](/Users/max/projects/mantoni/visual-aid/docs/specs/0005-interactive-ui-behavior.md): live DOM updates from UI events and polling
- [docs/specs/0006-format-aware-renderers.md](/Users/max/projects/mantoni/visual-aid/docs/specs/0006-format-aware-renderers.md): first-pass renderer semantics for each supported format
- [docs/specs/0007-mcp-diagnostics.md](/Users/max/projects/mantoni/visual-aid/docs/specs/0007-mcp-diagnostics.md): diagnostic tool and resource behavior for host integration
- [docs/specs/0008-dogfooding-start-workflow.md](/Users/max/projects/mantoni/visual-aid/docs/specs/0008-dogfooding-start-workflow.md): canonical `npm start` dogfood behavior and Codex config expectations
- [docs/decisions/README.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/README.md): how decisions are recorded
- [docs/decisions/0001-markdown-first-agent-workflow.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0001-markdown-first-agent-workflow.md): first architectural decision record
- [docs/decisions/0002-initial-mcp-contract-and-payload-envelope.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0002-initial-mcp-contract-and-payload-envelope.md): initial app control contract and payload shape
- [docs/decisions/0003-initial-scaffold-stack-and-layout.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0003-initial-scaffold-stack-and-layout.md): initial implementation stack and repository layout
- [docs/decisions/0004-initial-file-based-session-bridge.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0004-initial-file-based-session-bridge.md): initial live bridge between MCP and the desktop app
- [docs/decisions/0005-documentation-integrated-testing.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0005-documentation-integrated-testing.md): testing model tied to behavior specs
- [docs/decisions/0006-initial-format-aware-renderers.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0006-initial-format-aware-renderers.md): first-pass renderer strategy for markdown, diff, mermaid, excalidraw, and HTML
- [docs/decisions/0007-npm-start-canonical-dogfood-entrypoint.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0007-npm-start-canonical-dogfood-entrypoint.md): define `npm start` as the canonical local dogfood entrypoint
- [docs/decisions/0008-session-history-and-item-replacement.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0008-session-history-and-item-replacement.md): define selectable history and `id`-aware append behavior
- [docs/decisions/0009-rendered-mermaid-diagrams.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0009-rendered-mermaid-diagrams.md): render Mermaid diagrams by default while preserving source fallback

## Documentation Rules

- Significant product, architecture, and process decisions must be captured as markdown before or alongside implementation.
- When a decision changes prior direction, the relevant decision record and affected documents must be updated in the same change.
- The markdown documents are the primary project memory for future agent work.

## Default Development Path

The canonical local dogfood flow is:

1. Run `npm start` to create or reuse `.visual-aid/dev-session.json` and launch the Tauri app in dev mode.
2. Point Codex `config.toml` at that same session file. Run `npm start -- --print-codex-config` to print the exact MCP config block for the current checkout.
3. Use `visual-aid.status`, `visual-aid.open`, `visual-aid.show`, and `visual-aid.clear` through Codex against that shared session.

See [docs/dogfooding.md](/Users/max/projects/mantoni/visual-aid/docs/dogfooding.md) for the concise setup and quick test sequence.

Useful commands:

- `npm start`: canonical local dogfood entrypoint for the app
- `npm start -- --print-codex-config`: print the exact Codex MCP config block for the current checkout
- `npm run check`: type-check the project
- `npm test`: run the automated test suite
- `npm run verify`: run type checks, tests, and frontend build together
- `npm run build`: build the frontend bundle
- `npm run tauri:dev`: lower-level Tauri app dev command used by the supervisor
- `npm run tauri:build`: build the desktop app bundle
- `npm run mcp`: package-script wrapper for the stdio MCP server; Codex config should use `npx tsx mcp/server.ts` directly to avoid npm banner output
- `npm run demo:payload`: write a sample session payload to `.visual-aid/session.json`

Environment variables:

- `VISUAL_AID_SESSION_PATH`: override the JSON session file path for manual MCP or app runs; `npm start` uses `.visual-aid/dev-session.json`
- `VISUAL_AID_OPEN_COMMAND`: explicit command used by `visual-aid.open`
- `VISUAL_AID_APP_PATH`: explicit app bundle path used by `visual-aid.open`

If no launch override is configured, the MCP server will try to auto-discover a local macOS app bundle or binary under `src-tauri/target/`.
