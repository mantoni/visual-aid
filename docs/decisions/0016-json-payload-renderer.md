# 0016: JSON Payload Renderer

## Status

Accepted

## Context

The project already handles structured formats such as Markdown, Mermaid, diffs, and HTML, but it has no dedicated view for raw JSON artifacts.

That leaves a common agent output format stuck in the generic preformatted fallback even though users often need to inspect nested keys, arrays, booleans, and nulls quickly.

## Decision

`json` becomes a first-class payload format in the shared envelope and renderer.

Specifically:

- the payload `format` enum now includes `json`
- valid JSON renders as a parsed tree view with expandable nested structure
- the UI keeps a raw JSON preview available for inspection
- invalid JSON still renders as a readable fallback with an explicit parse failure message

## Consequences

Positive consequences:

- agents can send raw data structures without wrapping them in Markdown or HTML first
- nested JSON becomes easier to inspect than a plain monospaced blob
- the fallback path stays debuggable when the payload is malformed

Costs and constraints:

- the renderer still treats JSON as a viewer rather than an editable data explorer
- deeply nested payloads may require future UX refinements for collapse behavior or search
- this expands the visible payload contract and therefore requires matching docs and tests
