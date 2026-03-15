# 0026: Sanitized HTML In Markdown

## Status

Accepted

## Context

Markdown payloads already support richer embedded renderers for code, Mermaid, and diff, but raw HTML inside Markdown is still blocked.

That makes common authoring patterns such as inline emphasis wrappers, small callout fragments, and lightweight HTML layout snippets fail inside Markdown documents even though the product already supports standalone HTML fragments.

At the same time, enabling unrestricted raw HTML inside Markdown would weaken the renderer's safety and blur the boundary between Markdown and standalone `html` payloads.

## Decision

Markdown raw HTML snippets will render as sanitized host-DOM content inside the Markdown surface.

Specifically:

- the Markdown parser accepts raw HTML in inline and block contexts
- the rendered Markdown output is sanitized before insertion into the host DOM
- unsafe elements such as scripts, styles, and iframes are removed
- standalone `html` payloads continue to use the isolated iframe renderer rather than sharing the Markdown host-DOM path

## Consequences

Positive consequences:

- inline and block HTML snippets become usable inside Markdown payloads
- Markdown documents can express richer mixed-content explanations without switching payload formats
- the renderer keeps a clear distinction between sanitized Markdown HTML and isolated standalone HTML payloads

Costs and constraints:

- Markdown rendering now depends on an HTML sanitizer in addition to the Markdown parser
- sanitized Markdown HTML is still intentionally more constrained than standalone `html` payloads
- the renderer must preserve its own generated markup and data attributes through sanitization
