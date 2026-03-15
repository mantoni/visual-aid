# 0025: Embedded Diff In Markdown

## Status

Accepted

## Context

The project already renders standalone unified diff payloads with structured line classification, and Markdown now supports richer embedded viewers for some fenced languages.

Agent output often mixes explanation and patches in one Markdown document. Treating fenced diffs as plain highlighted code loses the existing add/remove/hunk/file presentation that makes the standalone diff renderer useful.

## Decision

Markdown fenced code blocks declared as `diff` will render as embedded structured diff views inside the Markdown surface.

Specifically:

- the Markdown renderer reuses the existing diff renderer instead of a Markdown-only implementation
- embedded diff blocks stay inside the Markdown document flow
- line classification remains shared with standalone diff payloads
- common `patch` fences normalize to the same embedded diff renderer path

## Consequences

Positive consequences:

- agents can keep explanation and patch content together in one Markdown payload
- standalone and embedded diff rendering stay visually and behaviorally consistent
- future diff improvements can apply to both contexts through one renderer path

Costs and constraints:

- Markdown fence rendering now branches on another language-specific embedded viewer
- embedded diff blocks need layout rules so they sit cleanly within the Markdown surface
