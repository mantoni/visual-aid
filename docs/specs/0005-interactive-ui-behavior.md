# Spec 0005: Interactive UI Behavior

## Purpose

Define the live DOM behavior of the app shell when it receives custom UI events or desktop polling updates.

Related decisions:

- [0004-initial-file-based-session-bridge.md](../decisions/0004-initial-file-based-session-bridge.md)
- [0005-documentation-integrated-testing.md](../decisions/0005-documentation-integrated-testing.md)
- [0012-push-based-session-bridge.md](../decisions/0012-push-based-session-bridge.md)

## Preconditions

- `bootstrapApp` attaches UI event handlers to the current window.
- Valid custom events use the same payload envelope as the MCP session flow.
- Tauri-mode startup consumes session updates through the desktop bridge.

## Invariants

- Valid `visual-aid:show` events update the live DOM.
- Invalid `visual-aid:show` payloads are ignored.
- `visual-aid:clear` resets the UI to the empty state.
- History-item clicks switch the current payload view to the selected session item.
- Host-driven session updates replace the rendered content in Tauri mode.

## Scenarios

### VUI-EVENT-001 Custom show events update the current payload view

Given a bootstrapped non-Tauri app shell
When a valid `visual-aid:show` custom event is dispatched
Then the current payload title and content update in the DOM

### VUI-EVENT-002 Invalid custom show payloads are ignored

Given a bootstrapped non-Tauri app shell
When an invalid `visual-aid:show` custom event is dispatched
Then the existing rendered payload remains unchanged

### VUI-EVENT-003 Clear events reset the UI to the empty state

Given a bootstrapped non-Tauri app shell with rendered content
When a `visual-aid:clear` event is dispatched
Then the empty-state message becomes visible

### VUI-HISTORY-001 Clicking a history item updates the current payload view

Given a bootstrapped non-Tauri app shell with multiple rendered items
When the user clicks an older history item
Then the current payload view updates to that item
And the clicked history item becomes active

### VUI-BRIDGE-001 Host bridge updates replace the DOM in Tauri mode

Given a bootstrapped Tauri app shell
When the desktop bridge delivers a session update
Then the current payload title and status update in the DOM

## Test Mapping

- `tests/ui/bootstrap.test.ts`: `VUI-EVENT-001`, `VUI-EVENT-002`, `VUI-EVENT-003`, `VUI-HISTORY-001`, `VUI-BRIDGE-001`
