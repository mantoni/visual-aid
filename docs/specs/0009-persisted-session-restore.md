# Spec 0009: Persisted Session Restore

## Purpose

Define the desktop host behavior for persisting and restoring the last known good rendered session.

Related decisions:

- [0004-initial-file-based-session-bridge.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0004-initial-file-based-session-bridge.md)
- [0010-last-known-good-session-restore.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0010-last-known-good-session-restore.md)

## Preconditions

- The desktop host reads the active session through the configured session path.
- The desktop host may write a local persisted snapshot file derived from that session path.
- The renderer continues to consume a `VisualAidSession` from the bridge without changing the MCP payload envelope.

## Invariants

- A non-empty `show` session becomes the current persisted snapshot for that session path.
- If the live session file is missing or unreadable, the desktop bridge falls back to the persisted snapshot when one exists.
- A `clear` session removes the persisted snapshot for that session path.

## Scenarios

### VPS-PERSIST-001 Non-empty show sessions are persisted as the last known good snapshot

Given a readable live session with rendered items
When the desktop bridge loads that session
Then the same session is written to the derived persisted snapshot path

### VPS-RESTORE-001 Missing live sessions fall back to the persisted snapshot

Given no readable live session file
And a persisted snapshot exists for that session path
When the desktop bridge loads the session state
Then the bridge returns the persisted snapshot

### VPS-CLEAR-001 Clear sessions remove the persisted snapshot

Given a persisted snapshot exists for the session path
And the live session records `lastAction` as `clear`
When the desktop bridge loads the session state
Then the persisted snapshot file is removed
And the bridge returns the cleared live session

## Test Mapping

- `src-tauri/src/main.rs`: `VPS-PERSIST-001`, `VPS-RESTORE-001`, `VPS-CLEAR-001`
