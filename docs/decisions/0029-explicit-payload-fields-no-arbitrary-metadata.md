# 0029: Explicit Payload Fields Without Arbitrary Metadata

## Status

Accepted

## Context

The shared payload envelope included an open-ended `metadata` object and the desktop UI rendered that object in a sidebar panel. In practice, this created two problems:

- agents could send arbitrary keys without a documented contract
- the UI exposed transport details that were not consistently meaningful to users

The only current metadata use with concrete product value is the source-code language hint.

## Decision

The shared payload envelope no longer accepts arbitrary `metadata`.

Specifically:

- `visual-aid.show` payloads reject unknown top-level fields instead of silently accepting them
- the payload envelope adds an explicit optional `language` field for source-code payloads
- the desktop renderer removes the metadata sidebar panel
- any future payload property that matters to rendering or inspection should be added as an explicit documented field

## Consequences

Positive consequences:

- the MCP contract becomes smaller and more predictable
- renderer-relevant properties become documented and testable instead of ad hoc
- the desktop UI focuses on the rendered artifact and history instead of envelope internals

Costs and constraints:

- old examples that used `metadata.language` must move to `language`
- future renderer hints require an explicit contract update instead of ad hoc metadata
