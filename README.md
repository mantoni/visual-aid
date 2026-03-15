# visual-aid

## Purpose

`visual-aid` is a Tauri application that gives coding agents a dedicated way to present structured information to users as visual output.

Agents should be able to launch the app and send it structured payloads over MCP. The app then renders those payloads in a form that is easy for a user to inspect and understand.

## What The App Should Support

The visual aid is intended for structured formats such as:

- Markdown
- JSON
- Unified diff
- Mermaid
- Excalidraw
- HTML

The set of supported formats can grow over time as new agent workflows emerge, but those formats are added in the product codebase rather than through a plugin model.

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

- [docs/agent-workflow.md](docs/agent-workflow.md): operating rules for agent-driven work in this repository
- [docs/architecture.md](docs/architecture.md): current system shape and technical boundaries
- [docs/installation.md](docs/installation.md): source-first installation guide and prerequisites
- [docs/usage.md](docs/usage.md): how to run the app, connect Codex, and send payloads
- [docs/dogfooding.md](docs/dogfooding.md): canonical local dogfood flow centered on `npm start`
- [docs/backlog.md](docs/backlog.md): current prioritized backlog and accepted future direction
- [docs/product.md](docs/product.md): product intent, scope, and milestone direction
- [docs/specs/README.md](docs/specs/README.md): behavior-spec convention and test mapping rules
- [docs/specs/0001-mcp-session-flow.md](docs/specs/0001-mcp-session-flow.md): initial acceptance spec for `visual-aid.open`, `show`, and `clear`
- [docs/specs/0002-desktop-bridge-and-renderer-state.md](docs/specs/0002-desktop-bridge-and-renderer-state.md): polling and renderer-state behavior
- [docs/specs/0003-mcp-stdio-integration.md](docs/specs/0003-mcp-stdio-integration.md): end-to-end MCP client/server behavior
- [docs/specs/0004-renderer-output.md](docs/specs/0004-renderer-output.md): visible renderer output and layout behavior
- [docs/specs/0005-interactive-ui-behavior.md](docs/specs/0005-interactive-ui-behavior.md): live DOM updates from UI events and polling
- [docs/specs/0006-format-aware-renderers.md](docs/specs/0006-format-aware-renderers.md): first-pass renderer semantics for each supported format
- [docs/specs/0007-mcp-diagnostics.md](docs/specs/0007-mcp-diagnostics.md): diagnostic tool and resource behavior for host integration
- [docs/specs/0008-dogfooding-start-workflow.md](docs/specs/0008-dogfooding-start-workflow.md): canonical `npm start` dogfood behavior and Codex config expectations
- [docs/specs/0009-persisted-session-restore.md](docs/specs/0009-persisted-session-restore.md): local restore behavior for the last known good rendered session
- [docs/specs/0010-workspace-tabs.md](docs/specs/0010-workspace-tabs.md): first-pass single-window workspace tab behavior
- [docs/specs/0011-github-release-distribution.md](docs/specs/0011-github-release-distribution.md): release packaging and GitHub Releases publishing behavior
- [docs/specs/0012-cross-workspace-source-testing.md](docs/specs/0012-cross-workspace-source-testing.md): using this source checkout from another local workspace
- [docs/decisions/README.md](docs/decisions/README.md): how decisions are recorded
- [docs/decisions/0001-markdown-first-agent-workflow.md](docs/decisions/0001-markdown-first-agent-workflow.md): first architectural decision record
- [docs/decisions/0002-initial-mcp-contract-and-payload-envelope.md](docs/decisions/0002-initial-mcp-contract-and-payload-envelope.md): initial app control contract and payload shape
- [docs/decisions/0003-initial-scaffold-stack-and-layout.md](docs/decisions/0003-initial-scaffold-stack-and-layout.md): initial implementation stack and repository layout
- [docs/decisions/0004-initial-file-based-session-bridge.md](docs/decisions/0004-initial-file-based-session-bridge.md): initial live bridge between MCP and the desktop app
- [docs/decisions/0005-documentation-integrated-testing.md](docs/decisions/0005-documentation-integrated-testing.md): testing model tied to behavior specs
- [docs/decisions/0006-initial-format-aware-renderers.md](docs/decisions/0006-initial-format-aware-renderers.md): first-pass renderer strategy for markdown, diff, mermaid, excalidraw, and HTML
- [docs/decisions/0007-npm-start-canonical-dogfood-entrypoint.md](docs/decisions/0007-npm-start-canonical-dogfood-entrypoint.md): define `npm start` as the canonical local dogfood entrypoint
- [docs/decisions/0008-session-history-and-item-replacement.md](docs/decisions/0008-session-history-and-item-replacement.md): define selectable history and `id`-aware append behavior
- [docs/decisions/0009-rendered-mermaid-diagrams.md](docs/decisions/0009-rendered-mermaid-diagrams.md): render Mermaid diagrams by default while preserving source fallback
- [docs/decisions/0010-last-known-good-session-restore.md](docs/decisions/0010-last-known-good-session-restore.md): persist and restore the last known good rendered session snapshot
- [docs/decisions/0011-isolated-html-fragments.md](docs/decisions/0011-isolated-html-fragments.md): render HTML payloads as isolated fragments with app-owned styling
- [docs/decisions/0012-push-based-session-bridge.md](docs/decisions/0012-push-based-session-bridge.md): replace renderer polling with host-emitted desktop session updates
- [docs/decisions/0013-project-owned-format-expansion.md](docs/decisions/0013-project-owned-format-expansion.md): keep new format support in the core codebase rather than plugins
- [docs/decisions/0014-single-window-workspace-tabs.md](docs/decisions/0014-single-window-workspace-tabs.md): define future multi-session browsing around single-window workspace tabs
- [docs/decisions/0015-richer-markdown-rendering.md](docs/decisions/0015-richer-markdown-rendering.md): upgrade Markdown rendering from a minimal subset to a richer parser-backed view
- [docs/decisions/0016-json-payload-renderer.md](docs/decisions/0016-json-payload-renderer.md): add JSON as a first-class payload format with parsed and fallback views
- [docs/decisions/0017-github-release-distribution.md](docs/decisions/0017-github-release-distribution.md): define GitHub Actions and GitHub Releases as the first packaged distribution path
- [docs/decisions/0018-source-checkout-cross-workspace-testing.md](docs/decisions/0018-source-checkout-cross-workspace-testing.md): separate source checkout location from target workspace identity during local testing

## Documentation Rules

- Significant product, architecture, and process decisions must be captured as markdown before or alongside implementation.
- When a decision changes prior direction, the relevant decision record and affected documents must be updated in the same change.
- The markdown documents are the primary project memory for future agent work.

## Default Development Path

The canonical local dogfood flow is:

1. Run `npm start` to create or reuse `.visual-aid/dev-session.json` and launch the Tauri app in dev mode.
2. Point Codex `config.toml` at that same session file. Run `npm start -- --print-codex-config` to print the exact MCP config block for the current checkout.
3. Use `visual-aid.status`, `visual-aid.open`, `visual-aid.show`, and `visual-aid.clear` through Codex against that shared session.

When you want to test from another local project while keeping this checkout as the source of truth, pass `--workspace-cwd /absolute/path/to/other-project` to both `npm start` and `npm start -- --print-codex-config`.

See [docs/dogfooding.md](docs/dogfooding.md) for the concise setup and quick test sequence.

Useful commands:

- `npm start`: canonical local dogfood entrypoint for the app
- `npm start -- --print-codex-config`: print the exact Codex MCP config block for the current checkout
- `npm start -- --workspace-cwd /absolute/path/to/other-project`: launch the dev app against another workspace's session file
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
- `VISUAL_AID_WORKSPACE_CWD`: override the workspace identity used for registry and tab labeling
- `VISUAL_AID_REGISTRY_PATH`: override the shared workspace registry path used for multi-workspace session discovery
- `VISUAL_AID_OPEN_COMMAND`: explicit command used by `visual-aid.open`
- `VISUAL_AID_APP_PATH`: explicit app bundle path used by `visual-aid.open`
- `VISUAL_AID_PREFER_DEBUG_APP`: when set to `1`, prefer the local debug build during launch auto-detection

If no launch override is configured, the MCP server will try to auto-discover a local macOS app bundle or binary under `src-tauri/target/`.
