# Architecture

## Current Shape

The target system is a Tauri desktop application that acts as a rendering surface for structured content produced by a coding agent.

At a high level:

- the coding agent is the producer of structured payloads
- MCP is the control and communication layer
- the Tauri app is the local visual renderer shown to the user

The initial scaffold uses:

- a Vite-based vanilla TypeScript frontend for the renderer UI
- a Tauri v2 Rust host in `src-tauri/`
- a Node-based MCP server in `mcp/`
- a file-based session bridge for the first desktop integration step

## Core Responsibilities

The application is expected to:

- launch locally when requested by an agent
- receive structured data from the agent through MCP
- determine how to render the payload based on its declared format
- present a user-readable visual representation

## Initial Renderer Semantics

The first renderer pass is format-aware without depending on heavyweight external renderer libraries.

- Markdown is rendered into simple semantic HTML for headings, paragraphs, lists, tables, links, sanitized raw HTML snippets, syntax-highlighted fenced code blocks, embedded Mermaid fences, and embedded diff fences.
- Source code is rendered as a dedicated syntax-highlighted code viewer with an optional language label.
- JSON is rendered as a parsed tree view with a raw fallback for inspection.
- Unified diff is rendered as structured line groups with add, remove, hunk, and file markers.
- Mermaid is rendered as a diagram when possible, with the source kept available as a fallback and inspection surface.
- HTML is rendered as fragment-oriented content inside a sandboxed isolated payload surface with app-provided base styles.
- The renderer uses a single main viewer with top-level workspace tabs keyed by working directory, a reverse-chronological history sidebar for the selected workspace, and a branded splash surface when the active workspace has no rendered payloads.

This keeps the early renderer surface explicit and testable while leaving room for richer format-specific engines later.

## Initial MCP Contract

The initial MCP surface should stay intentionally small:

- `visual-aid.status`: return diagnostic information about the MCP server and session state
- `visual-aid.open`: launch the app or focus an existing instance
- `visual-aid.show`: send a structured payload to the app and render it
- `visual-aid.clear`: clear the current rendered view

`visual-aid.show` may launch the app implicitly if it is not already running, but `visual-aid.open` remains useful for explicit control and debugging.

The server also exposes a diagnostic resource:

- `visual-aid://status`: readable JSON status for host integration and debugging

## Initial Desktop Bridge

The first live bridge between the MCP server and the desktop app is file-based:

- the MCP server writes the current session state to a JSON file
- the MCP server writes the active workspace id plus per-workspace session paths to a shared registry file
- the MCP server resolves workspace identity from a tool `cwd` argument first, then from an explicit environment override, then from `process.cwd()`
- the Tauri host exposes a command that assembles renderer-facing workspace state from the registry plus referenced session files
- the Tauri host keeps a last known good non-empty workspace-state snapshot derived from the registry path for local recovery
- the Tauri host watches the shared registry path and emits renderer updates when the assembled workspace state changes
- the MCP server can auto-discover a local app bundle or release binary for launch in development

This is an intentionally simple bridge for early implementation. It allows the contract and renderer shell to become usable before introducing a more direct runtime message channel.

## Initial Payload Envelope

The first payload contract is a versioned envelope shared across supported formats.

Required fields:

- `version`: payload schema version, starting at `1`
- `format`: one of `markdown`, `code`, `json`, `diff`, `mermaid`, or `html`
- `content`: string payload to render

Optional fields:

- `id`: stable identifier for updates or replacement within session history
- `title`: short user-facing label
- `summary`: short human-readable description
- `language`: optional syntax-highlighting hint for source code payloads
- `mode`: render intent, initially `replace` or `append`

This keeps transport consistent while allowing renderers to branch on `format`.

## Initial Supported Payload Types

The first target payload families are:

- Markdown
- Source code
- JSON
- Unified diff
- Mermaid
- HTML

These should be treated as render targets, not as implementation commitments to any specific parsing or storage library yet.

## Initial Architectural Boundaries

- The agent owns content creation.
- The app owns presentation.
- MCP owns invocation and message transport between the two.
- The project should preserve a clear boundary between transport and rendering so new formats can be added without redefining the integration model.
- The initial desktop bridge may be replaced later without changing the external MCP payload envelope.

## Product Direction

The following direction is now explicit even where implementation is still pending:

- additional formats are added in the product codebase rather than through a plugin model
- multi-session browsing stays inside a single app window through workspace tabs keyed by working directory
- a future full-document HTML workflow should use a separate explicit format instead of broadening fragment-oriented `html`

## Open Questions

The following are still intentionally undecided:

- whether the project should add a separate non-Codex helper that launches both the app and the MCP server for manual workflows
