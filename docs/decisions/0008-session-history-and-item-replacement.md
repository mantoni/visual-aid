# 0008: Session History And Item Replacement

## Status

Accepted

## Context

The initial MCP payload envelope already includes `mode` and optional `id` fields, but the project has not yet defined how those fields should behave once a session contains multiple items.

Without that definition, `append` mode is only partially useful:

- agents can add more session items, but the desktop UI cannot inspect older items
- repeated updates for the same logical artifact create duplicate history entries
- the renderer contract stays ambiguous for future agent sessions

The project needs a documented session model that makes append workflows practical without introducing a more complex multi-pane renderer.

## Decision

The renderer keeps a single main viewer and a reverse-chronological history sidebar.

Specifically:

- the newest session item is selected by default whenever the session changes
- the user may select an older history item locally in the renderer UI
- the current payload panel and metadata panel reflect the selected history item

The session item lifecycle for `visual-aid.show` is:

- `replace` mode resets the session to a single item containing the new payload
- `append` mode without a matching `id` appends a new newest item
- `append` mode with a matching `id` replaces the existing logical item and promotes the updated payload to the newest history position

This keeps the MCP payload envelope unchanged while making repeated agent updates and history inspection practical.

## Consequences

Positive consequences:

- append workflows become useful for real multi-step agent sessions
- agents can update a logical artifact without leaving duplicate stale entries
- the renderer model stays simple enough for the current file-based bridge

Costs and constraints:

- local history selection is UI state and is not persisted in the shared session file
- `replace` remains intentionally destructive at the session level
- future multi-pane or persistent session work may still revise the renderer model
