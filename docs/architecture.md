# Architecture

## Current Shape

The target system is a Tauri desktop application that acts as a rendering surface for structured content produced by a coding agent.

At a high level:

- the coding agent is the producer of structured payloads
- MCP is the control and communication layer
- the Tauri app is the local visual renderer shown to the user

## Core Responsibilities

The application is expected to:

- launch locally when requested by an agent
- receive structured data from the agent through MCP
- determine how to render the payload based on its declared format
- present a user-readable visual representation

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

- exact MCP tool surface exposed by the app
- payload schema and versioning model
- single-document versus multi-pane rendering model
- persistence of rendered sessions
- plugin model for additional formats

These should be resolved through decision records as implementation starts.
