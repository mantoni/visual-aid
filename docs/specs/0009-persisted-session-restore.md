# Spec 0009: Persisted Session Restore

## Purpose

Define the desktop host behavior for persisting and restoring the last known good rendered workspace state.

Related decisions:

- [0004-initial-file-based-session-bridge.md](../decisions/0004-initial-file-based-session-bridge.md)
- [0020-normalized-workspace-registry.md](../decisions/0020-normalized-workspace-registry.md)

## Preconditions

- The desktop host reads the active workspace registry through the configured registry path.
- Each registry entry points at a workspace session path.
- The desktop host may write a local persisted workspace-state snapshot file derived from the registry path.
- The renderer continues to consume workspace-scoped `VisualAidSession` objects from the bridge without changing the MCP payload envelope.

## Invariants

- A non-empty `show` workspace state becomes the current persisted snapshot for that registry path.
- If the live registry file is missing or unreadable, the desktop bridge falls back to the persisted workspace-state snapshot when one exists.
- If the live registry file is present but a referenced session file is missing or unreadable, the desktop bridge may fall back to the matching persisted workspace session when one exists.
- A workspace state whose live sessions are all cleared removes the persisted snapshot for that registry path.

## Scenarios

### VPS-PERSIST-001 Non-empty show sessions are persisted as the last known good snapshot

Given a readable live registry with a workspace whose session file contains rendered items
When the desktop bridge loads that workspace state
Then the same workspace state is written to the derived persisted snapshot path

### VPS-RESTORE-001 Missing live sessions fall back to the persisted snapshot

Given no readable live registry file
And a persisted snapshot exists for that registry path
When the desktop bridge loads the session state
Then the bridge returns the persisted snapshot

### VPS-CLEAR-001 Clear sessions remove the persisted snapshot

Given a persisted snapshot exists for the registry path
And the live workspace state records all sessions with `lastAction` as `clear`
When the desktop bridge loads the session state
Then the persisted snapshot file is removed
And the bridge returns the cleared live workspace state

### VPS-RESTORE-002 Missing live workspace sessions fall back to the persisted snapshot

Given a readable live registry file
And one referenced workspace session file is missing or unreadable
And a persisted workspace-state snapshot exists for that registry path
When the desktop bridge loads the workspace state
Then the affected workspace session is restored from the persisted snapshot

## Test Mapping

- `src-tauri/src/main.rs`: `VPS-PERSIST-001`, `VPS-RESTORE-001`, `VPS-CLEAR-001`, `VPS-RESTORE-002`
