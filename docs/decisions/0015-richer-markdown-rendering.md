# 0015: Richer Markdown Rendering

## Status

Accepted

## Context

The initial Markdown renderer was intentionally minimal. It handled headings, paragraphs, bullet lists, and fenced code blocks with a small hand-rolled formatter.

That was enough to bootstrap the app, but it is no longer strong enough for daily use. Markdown is one of the project's core payload types, and weak rendering makes explanations, plans, and technical notes materially harder to inspect than they should be.

## Decision

Markdown rendering moves from a hand-rolled subset parser to a richer Markdown parser with controlled HTML behavior.

Specifically:

- Markdown keeps rendering directly in the host UI rather than an isolated iframe
- raw HTML inside Markdown is controlled by the Markdown renderer rather than becoming unrestricted host-DOM injection
- the renderer supports richer document structure including ordered lists, blockquotes, tables, links, and fenced code blocks
- fenced code blocks may surface the declared language label in the UI
- Markdown may render some fenced languages, such as `mermaid` and `diff`, through richer embedded viewers instead of plain code blocks

The raw-HTML-specific portion of this decision is superseded by [0026-sanitized-html-in-markdown.md](0026-sanitized-html-in-markdown.md).

## Consequences

Positive consequences:

- Markdown payloads become substantially closer to what agents and users expect from technical documents
- richer explanations can stay in `markdown` instead of forcing an early switch to `html`
- the renderer contract stays testable with DOM assertions

Costs and constraints:

- the frontend now depends on a Markdown parser library
- Markdown still does not become an unrestricted HTML execution surface
- future presentation upgrades may still refine typography or code rendering without changing the payload contract
