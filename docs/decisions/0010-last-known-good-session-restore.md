# 0010: Last Known Good Session Restore

## Status

Accepted

## Context

The current renderer already supports multi-item session history, but that history only exists as long as the active session file remains readable.

That is good enough for the earliest MCP loop, but it is weak for everyday dogfooding. If the live session file disappears, becomes unreadable, or is recreated elsewhere, the desktop app loses the most recent useful artifact trail even though the renderer model already knows how to display it.

The project needs a persistence step that improves recovery without changing the MCP payload envelope or introducing a larger multi-session storage model yet.

## Decision

The desktop host persists the last known good non-empty rendered session for each session path.

Specifically:

- the persisted snapshot path is derived from the configured live session path
- reading a non-empty `show` session refreshes the persisted snapshot
- if the live session file is missing or unreadable, the host returns the persisted snapshot when available
- reading a `clear` session removes the persisted snapshot for that session path

This keeps persistence local to the desktop bridge and leaves the external MCP contract unchanged.

## Consequences

Positive consequences:

- the existing history sidebar becomes recoverable across host restarts and file loss
- the app can recover the latest useful rendered state without asking the MCP server for a new payload
- persistence remains scoped to the current session model instead of introducing a second archive UX

Costs and constraints:

- persistence is still limited to one last known good snapshot per session path
- `clear` remains intentionally destructive for both the live session and its persisted fallback
- richer multi-session browsing may still be added later if the product needs it
