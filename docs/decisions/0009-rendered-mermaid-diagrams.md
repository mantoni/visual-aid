# 0009: Rendered Mermaid Diagrams With Source Fallback

## Status

Accepted

## Context

The initial format-aware renderer deliberately treated Mermaid payloads as diagram source only.

That was a useful bootstrap step, but it leaves one of the project's highest-value artifact types short of the product goal. Architecture diagrams are explicitly part of the value proposition, and reading raw Mermaid text is materially weaker than inspecting the rendered graph.

At the same time, Mermaid rendering can fail because of invalid syntax, unsupported features, or runtime issues. The renderer therefore needs a richer default view without losing the inspectable source that made the initial implementation safe and debuggable.

## Decision

Mermaid payloads will render as diagrams in the renderer UI when the Mermaid engine succeeds.

Specifically:

- the renderer hydrates Mermaid payloads after the initial DOM render
- a rendered diagram becomes the primary Mermaid view
- the raw Mermaid source remains available in the payload panel
- if Mermaid rendering fails or the renderer is unavailable, the UI falls back to the source view with an explicit message
- the same rendered-diagram and source-fallback model may be reused for Mermaid blocks embedded in other renderer surfaces such as Markdown

This keeps the MCP payload envelope and session model unchanged while improving one of the most important visual formats.

## Consequences

Positive consequences:

- architecture and flow diagrams become directly inspectable in the app
- Mermaid payloads better match the product promise of Visual AId rather than a text viewer
- failures remain debuggable because the source is still present in the UI

Costs and constraints:

- the frontend now depends on the Mermaid renderer library
- Mermaid output is still a viewer, not a full diagram editor
- this supersedes the Mermaid-specific source-viewer portion of [0006-initial-format-aware-renderers.md](0006-initial-format-aware-renderers.md)
