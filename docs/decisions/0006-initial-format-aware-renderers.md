# 0006: Initial Format-Aware Renderers

## Status

Accepted

## Context

The project currently supports multiple payload formats, but a single preformatted fallback is too weak to provide meaningful visual aid across markdown, JSON, diff, mermaid, excalidraw, and HTML.

At the same time, introducing full rendering libraries for every format this early would add complexity faster than the project can validate.

## Decision

The first format-aware renderer pass will use lightweight built-in renderers with specialized presentation per format.

Specifically:

- markdown will render to semantic HTML for common document structure
- json will render to a parsed tree view plus raw fallback when valid
- diff will render as classified line rows with visual add/remove/hunk/file distinction
- mermaid will render as a diagram-source viewer with format-specific framing
- excalidraw will render a parsed summary view plus JSON preview when valid
- HTML will render inside the payload container

## Consequences

Positive consequences:

- users get visibly different renderers per payload type now
- behavior stays easy to test with DOM assertions
- the project avoids premature dependency weight

Costs and constraints:

- markdown support is intentionally partial rather than full CommonMark
- json rendering is a structured viewer, not an interactive editor
- excalidraw is still a specialized viewer, not a fully interactive engine
- richer rendering libraries may still be needed later and could replace these implementations

The Mermaid-specific source-viewer portion of this decision is superseded by [0009-rendered-mermaid-diagrams.md](0009-rendered-mermaid-diagrams.md).
The HTML-specific direct-container portion of this decision is superseded by [0011-isolated-html-fragments.md](0011-isolated-html-fragments.md).
The Markdown-specific minimal-parser portion of this decision is superseded by [0015-richer-markdown-rendering.md](0015-richer-markdown-rendering.md).
