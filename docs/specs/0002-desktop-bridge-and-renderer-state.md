# Spec 0002: Desktop Bridge And Renderer State

## Purpose

Define the expected behavior for the desktop session bridge and the renderer-facing session state.

Related decisions:

- [0004-initial-file-based-session-bridge.md](../decisions/0004-initial-file-based-session-bridge.md)
- [0005-documentation-integrated-testing.md](../decisions/0005-documentation-integrated-testing.md)
- [0012-push-based-session-bridge.md](../decisions/0012-push-based-session-bridge.md)

## Preconditions

- The desktop app reads session data through the Tauri command bridge.
- The renderer works with `VisualAidSession` objects returned from the bridge.
- The desktop bridge bootstraps from an initial session read and listens for host-emitted session updates.

## Invariants

- The bridge emits an update when the session snapshot changes.
- The bridge suppresses duplicate updates for identical snapshots.
- The bridge treats semantically identical sessions as unchanged even when object key order differs.
- A `show` session with a current payload produces a format-specific status string.
- Non-Tauri startup uses a sample session so the shell is inspectable without the desktop bridge.

## Scenarios

### VAB-BRIDGE-001 Bridge emits when the session changes

Given a desktop bridge with a changed session snapshot
When the host delivers the next session update
Then the session listener is invoked with the new session

### VAB-BRIDGE-002 Bridge suppresses identical snapshots

Given a desktop bridge with an unchanged session snapshot
When the host delivers the next session update
Then the session listener is not invoked again

### VAB-BRIDGE-003 Bridge ignores metadata key reordering for unchanged sessions

Given a desktop bridge with the same session content but different metadata key order
When the host delivers the next session update
Then the session listener is not invoked again

### VAB-STATUS-001 Show status reflects the current payload format

Given a session whose latest action is `show`
When the latest payload format is `markdown`
Then the renderer status is `Received Markdown payload`

### VAB-BOOT-001 Non-Tauri startup uses a sample session

Given the renderer is not running in a Tauri environment
When the initial view model is created
Then the initial session contains one sample item
And the initial status is `Renderer shell ready`

## Test Mapping

- `tests/bridge/polling.test.ts`: `VAB-BRIDGE-001`, `VAB-BRIDGE-002`, `VAB-BRIDGE-003`
- `tests/ui/view-model.test.ts`: `VAB-STATUS-001`, `VAB-BOOT-001`
