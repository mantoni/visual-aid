# 0024: Embedded Mermaid In Markdown

## Status

Accepted

## Context

The project already renders standalone Mermaid payloads as diagrams with source fallback, and Markdown now supports richer fenced code rendering.

That still leaves a gap for common agent output that mixes prose with Mermaid diagrams inside a single Markdown document. Requiring agents to split that content across separate Markdown and Mermaid payloads makes explanations harder to read as one cohesive artifact.

## Decision

Markdown fenced code blocks declared as `mermaid` will render as embedded Mermaid diagrams inside the Markdown view.

Specifically:

- the Markdown renderer emits the same Mermaid DOM shape used by standalone Mermaid payloads
- embedded Mermaid blocks reuse the existing Mermaid hydration path
- Mermaid source stays available through the same source disclosure UI
- if Mermaid rendering fails or the renderer is unavailable, the embedded block falls back to source preview

## Consequences

Positive consequences:

- agents can keep prose and diagrams together in one Markdown payload
- Mermaid rendering stays consistent across standalone and embedded contexts
- the fallback and inspection model remains shared and testable

Costs and constraints:

- Markdown fence rendering now branches on `mermaid` instead of treating every fence as plain code
- embedded Mermaid blocks require CSS adjustments so they fit the Markdown layout cleanly
