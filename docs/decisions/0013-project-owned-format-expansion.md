# 0013: Project-Owned Format Expansion

## Status

Accepted

## Context

The architecture left the format-extension model open, with a possible plugin model for additional formats.

That ambiguity is no longer helpful. The product needs a smaller and more opinionated surface so format behavior, testing, and documentation remain coherent across agent workflows.

## Decision

Additional formats will be added directly to the `visual-aid` codebase rather than through a plugin model.

Specifically:

- the product defines its supported formats itself
- new formats are contributed through normal repository changes
- each new format still requires the usual documentation, decision, spec, and test updates

## Consequences

Positive consequences:

- the renderer surface stays curated and easier to reason about
- supported formats remain covered by the same documentation and testing model
- future agents do not need to reason about plugin loading, sandboxing, or compatibility contracts

Costs and constraints:

- external format extensions require contribution to the core repository rather than drop-in plugins
- unsupported private workflows may require local forks until the product adopts them
- reversing this direction later would require a new decision record
