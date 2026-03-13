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

## Core Responsibilities

The application is expected to:

- launch locally when requested by an agent
- receive structured data from the agent through MCP
- determine how to render the payload based on its declared format
- present a user-readable visual representation

## Initial MCP Contract

The initial MCP surface should stay intentionally small:

- `visual-aid.open`: launch the app or focus an existing instance
- `visual-aid.show`: send a structured payload to the app and render it
- `visual-aid.clear`: clear the current rendered view

`visual-aid.show` may launch the app implicitly if it is not already running, but `visual-aid.open` remains useful for explicit control and debugging.

## Initial Payload Envelope

The first payload contract is a versioned envelope shared across supported formats.

Required fields:

- `version`: payload schema version, starting at `1`
- `format`: one of `markdown`, `diff`, `mermaid`, `excalidraw`, or `html`
- `content`: string payload to render

Optional fields:

- `id`: stable identifier for updates or replacement
- `title`: short user-facing label
- `summary`: short human-readable description
- `mode`: render intent, initially `replace` or `append`
- `metadata`: format-specific or workflow-specific structured metadata

This keeps transport consistent while allowing renderers to branch on `format`.

## Initial Supported Payload Types

The first target payload families are:

- Markdown
- Unified diff
- Mermaid
- Excalidraw
- HTML

These should be treated as render targets, not as implementation commitments to any specific parsing or storage library yet.

## Initial Architectural Boundaries

- The agent owns content creation.
- The app owns presentation.
- MCP owns invocation and message transport between the two.
- The project should preserve a clear boundary between transport and rendering so new formats can be added without redefining the integration model.

## Open Questions

The following are still intentionally undecided:

- single-document versus multi-pane rendering model
- persistence of rendered sessions
- plugin model for additional formats

These should be resolved through decision records as implementation starts.
