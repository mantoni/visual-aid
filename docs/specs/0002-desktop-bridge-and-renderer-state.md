# Spec 0002: Desktop Bridge And Renderer State

## Purpose

Define the initial expected behavior for the desktop polling bridge and the renderer-facing session state.

Related decisions:

- [0004-initial-file-based-session-bridge.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0004-initial-file-based-session-bridge.md)
- [0005-documentation-integrated-testing.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0005-documentation-integrated-testing.md)

## Preconditions

- The desktop app reads session data through the Tauri command bridge.
- The renderer works with `VisualAidSession` objects returned from the bridge.
- Session polling compares snapshots to avoid redundant updates.

## Invariants

- Polling emits an update when the session snapshot changes.
- Polling suppresses duplicate updates for identical snapshots.
- Polling treats semantically identical sessions as unchanged even when object key order differs.
- A `show` session with a current payload produces a format-specific status string.
- Non-Tauri startup uses a sample session so the shell is inspectable without the desktop bridge.

## Scenarios

### VAB-POLL-001 Polling emits when the session changes

Given a polling bridge with a changed session snapshot
When the next polling cycle runs
Then the session listener is invoked with the new session

### VAB-POLL-002 Polling suppresses identical snapshots

Given a polling bridge with an unchanged session snapshot
When the next polling cycle runs
Then the session listener is not invoked again

### VAB-POLL-003 Polling ignores metadata key reordering for unchanged sessions

Given a polling bridge with the same session content but different metadata key order
When the next polling cycle runs
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

- `tests/bridge/polling.test.ts`: `VAB-POLL-001`, `VAB-POLL-002`, `VAB-POLL-003`
- `tests/ui/view-model.test.ts`: `VAB-STATUS-001`, `VAB-BOOT-001`
