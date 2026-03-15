# 0002: Initial MCP Contract And Payload Envelope

## Status

Accepted

## Context

The project needs an initial integration boundary between the coding agent and the Tauri application before implementation starts. Without a documented contract, the transport layer and renderer design are likely to drift or become unnecessarily complex.

The first version should be small, explicit, and stable enough to support early implementation without locking the project into a large API surface.

## Decision

The initial MCP contract will expose four tools:

- `visual-aid.status`: return diagnostic information about the server and session
- `visual-aid.open`: launch the app or focus an existing instance
- `visual-aid.show`: render a structured payload in the app
- `visual-aid.clear`: clear the current rendered output

The server will also expose one fixed diagnostic resource:

- `visual-aid://status`: JSON status for host integration and debugging

The initial payload envelope for `visual-aid.show` will be:

```json
{
  "version": 1,
  "format": "markdown",
  "content": "# Example",
  "id": "optional-stable-id",
  "title": "Optional title",
  "summary": "Optional summary",
  "mode": "replace",
  "metadata": {}
}
```

Field rules:

- `version` is required and starts at `1`
- `format` is required and identifies the renderer
- `content` is required and contains the raw payload to render
- `id` is optional and can be used to replace or track a rendered item
- `title` and `summary` are optional user-facing descriptors
- `mode` is optional and initially supports `replace` and `append`
- `metadata` is optional and reserved for structured renderer-specific data

Initial supported `format` values are:

- `markdown`
- `json`
- `diff`
- `mermaid`
- `html`

The contract later added a dedicated `code` format in
[0023-source-code-rendering.md](0023-source-code-rendering.md).
Excalidraw support was removed later in
[0027-remove-excalidraw-format.md](0027-remove-excalidraw-format.md).

## Consequences

Positive consequences:

- implementation can start from a clear agent-to-app boundary
- the API surface remains small enough for a first working version
- new renderers can share one common transport shape

Costs and constraints:

- some future formats may require richer metadata than this first envelope provides
- detailed append behavior and item replacement semantics are defined later in [0008-session-history-and-item-replacement.md](0008-session-history-and-item-replacement.md)
- future incompatible changes will require a schema version increment and a new decision record

## Notes

This decision does not define:

- the internal Tauri state model
- the exact MCP server implementation approach
- renderer-specific parsing details

Those should be decided only when implementation pressure makes them necessary.
