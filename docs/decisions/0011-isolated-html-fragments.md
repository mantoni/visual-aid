# 0011: Isolated HTML Fragments

## Status

Accepted

## Context

The project supports `html` as one of its initial payload formats, but the current renderer injects payload markup directly into the host DOM.

That is inconsistent with the documented architecture, which already describes HTML as living in an isolated payload container. Direct host-DOM injection also makes payload styling and structure harder to reason about, because HTML artifacts can interfere with the app shell and the shell can accidentally style the artifact.

The product goal is a visual aid for structured artifacts, not a general-purpose browser tab. The HTML renderer therefore needs a contract that preserves rich markup while keeping the host UI stable and predictable.

## Decision

The `html` payload format represents fragment-oriented HTML rendered in an isolated sandboxed surface.

Specifically:

- the renderer treats `content` as fragment markup rather than a full standalone page contract
- the app renders the fragment inside a sandboxed iframe document
- the iframe is sized to the available document viewport height so the iframe remains the primary scroll surface for HTML payloads
- the iframe document includes app-owned base styles for common content elements
- scripts are not executed inside the HTML surface

If a future workflow needs full document ownership, that should be added as a separate explicit format instead of broadening `html`.

## Consequences

Positive consequences:

- HTML artifacts can use rich markup without affecting the host shell
- the app can provide a readable default presentation for common HTML fragments
- the app can dedicate the full document viewport to HTML previews without making the outer shell scroll
- the renderer contract becomes more predictable for testing and persistence

Costs and constraints:

- full-page HTML semantics are intentionally not part of the default `html` contract
- the renderer must maintain a small built-in stylesheet for fragment presentation
- future full-document workflows may require a separate renderer decision
