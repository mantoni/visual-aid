# 0032: HTML Wireframe Presentation

## Status

Accepted

## Context

The standalone `html` payload format already renders isolated fragments inside a sandboxed iframe with app-owned styling.

That works well when an agent wants to preview rich markup, but it still assumes the agent is responsible for most of the visual language. For lightweight UI ideation, that is too much pressure. Agents should be able to send a small semantic fragment and let the app supply a consistent low-fidelity presentation.

At the same time, this should not turn `html` into a general-purpose page format or an open-ended theming system.

## Decision

The payload envelope adds an explicit optional `presentation` field, and standalone `html` payloads initially support `default` and `wireframe`.

Specifically:

- `presentation` is a documented renderer-owned hint instead of ad hoc metadata
- `html` payloads keep the existing isolated fragment contract
- `presentation: "wireframe"` applies a built-in low-fidelity stylesheet inside the iframe document
- the wireframe presentation favors semantic elements, stronger labels for major regions, quieter repeated inner wrappers, and a small helper class vocabulary such as `va-stack`, `va-row`, `va-grid`, `va-sidebar`, `va-actions`, `va-card`, `va-cluster`, `va-spread`, `va-center`, and `va-kpi`
- the app remains responsible for the visual treatment; agents provide structure rather than bespoke CSS

The default `html` presentation remains available for richer fragment previews.

## Consequences

Positive consequences:

- agents can sketch interfaces with short HTML fragments instead of shipping entire styled pages
- wireframe previews become more consistent across sessions and agents
- the transport contract stays explicit and testable

Costs and constraints:

- the shared payload envelope grows by one more explicit field
- the renderer must maintain a second app-owned HTML presentation stylesheet
- the wireframe mode is intentionally narrow and should not become a generic theming surface
