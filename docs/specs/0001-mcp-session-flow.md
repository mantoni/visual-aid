# Spec 0001: MCP Session Flow

## Purpose

Define the initial accepted behavior for `visual-aid.open`, `visual-aid.show`, and `visual-aid.clear` in the file-based session bridge.

Related decisions:

- [0002-initial-mcp-contract-and-payload-envelope.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0002-initial-mcp-contract-and-payload-envelope.md)
- [0004-initial-file-based-session-bridge.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0004-initial-file-based-session-bridge.md)
- [0005-documentation-integrated-testing.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0005-documentation-integrated-testing.md)

## Preconditions

- The active session is stored as a JSON document.
- Payloads follow the version `1` envelope defined for the MCP contract.
- Supported formats include `markdown`, `diff`, `mermaid`, `excalidraw`, and `html`.

## Invariants

- `visual-aid.open` records an `open` action even if no launch target is available.
- `visual-aid.show` writes a valid session state using either replace or append semantics.
- `visual-aid.show` in `append` mode updates an existing item when the payload `id` matches a prior session item.
- `visual-aid.clear` removes all active items from the session state.
- Launch discovery prefers explicit overrides before auto-detected build artifacts.
- When a second app launch is attempted for the same project, the existing main window is focused instead of leaving multiple app windows open.

## Scenarios

### VAS-OPEN-001 Records open on an empty session

Given no prior session state
When `visual-aid.open` is applied
Then the session records `lastAction` as `open`
And the session preserves an `openedAt` timestamp

### VAS-SHOW-001 Replace mode resets the active item list

Given an empty session
When `visual-aid.show` receives a markdown payload in `replace` mode
Then the session contains exactly one item
And the item format is `markdown`

### VAS-SHOW-002 Append mode keeps prior items

Given a session with one item
When `visual-aid.show` receives a diff payload in `append` mode
Then the session contains two items
And the newest item format is `diff`

### VAS-SHOW-003 Append mode updates an existing item when the payload id matches

Given a session with an existing markdown item whose `id` is `plan`
When `visual-aid.show` receives an html payload in `append` mode with the same `id`
Then the session still contains one item with `id` `plan`
And the newest item format is `html`

### VAS-CLEAR-001 Clear removes all items

Given a session with rendered items
When `visual-aid.clear` is applied
Then the session contains zero items
And `lastAction` is `clear`

### VAS-LAUNCH-001 Environment command takes priority over auto-detection

Given both an explicit launch command and detectable local app artifacts
When launch discovery runs
Then the explicit launch command is selected

### VAS-LAUNCH-002 Canonical dogfood sessions prefer the debug app target

Given the canonical `.visual-aid/dev-session.json` session path
And both debug and release local app artifacts are detectable
When launch discovery runs
Then the debug binary is selected before the release artifacts

### VAS-SINGLE-INSTANCE-001 Duplicate app launches focus the existing main window

Given the app is already running for the project
When another app launch is attempted
Then the existing `main` window is shown and focused
And the project does not keep multiple app windows open

## Test Mapping

- `tests/mcp/session.test.ts`: `VAS-OPEN-001`, `VAS-SHOW-001`, `VAS-SHOW-002`, `VAS-SHOW-003`, `VAS-CLEAR-001`
- `tests/mcp/integration.test.ts`: `VAS-SHOW-003`
- `tests/mcp/launch.test.ts`: `VAS-LAUNCH-001`, `VAS-LAUNCH-002`
- `src-tauri/src/main.rs`: `VAS-SINGLE-INSTANCE-001`
