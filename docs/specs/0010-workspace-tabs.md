# Spec 0010: Workspace Tabs

## Purpose

Define the first workspace-scoped browsing behavior for the desktop app.

Related decisions:

- [0008-session-history-and-item-replacement.md](../decisions/0008-session-history-and-item-replacement.md)
- [0014-single-window-workspace-tabs.md](../decisions/0014-single-window-workspace-tabs.md)

## Preconditions

- The desktop bridge provides one or more workspace-scoped sessions to the renderer.
- Each workspace session corresponds to a working directory.
- The renderer remains a single-window application.

## Invariants

- The app shows a compact workspace switcher when more than one workspace session is available.
- Each workspace tab represents one working directory and keeps its own payload history.
- Each workspace tab exposes the full working directory path as a hover tooltip.
- The active workspace controls the available recents history, current payload view, and toolbar title.
- When a workspace receives a new session update from the desktop bridge, that workspace becomes active.
- Clicking a workspace tab switches the visible session locally without mutating other workspace histories.
- Closing a workspace tab removes it from the local tab strip without mutating the underlying workspace history.

## Scenarios

### VWT-TABS-001 Multiple workspaces render as tabs

Given a renderer state with two workspace sessions
When the renderer output is generated
Then the app shows a workspace tab for each working directory
And the active workspace tab is visually distinct

### VWT-TABS-002 Switching tabs swaps the visible workspace history

Given a renderer state with two workspace sessions and different payload histories
When the user selects the inactive workspace tab
Then the history sidebar updates to that workspace
And the current payload view updates to that workspace

### VWT-BRIDGE-001 Bridge updates can add and activate a new workspace

Given the desktop app is showing one workspace session
When the desktop bridge delivers an update that includes a second workspace as active
Then a new workspace tab appears
And that new workspace becomes the visible workspace

### VWT-TABS-003 Workspace tabs expose path tooltips and close controls

Given a renderer state with two workspace sessions
When the renderer output is generated
Then each workspace tab exposes its full working directory path through a hover tooltip
And each workspace tab includes a close control

### VWT-TABS-004 Closing an active workspace tab reveals another workspace

Given the desktop app is showing three workspace sessions
When the user closes the active workspace tab
Then that workspace tab is removed from the visible tab strip
And another visible workspace becomes active

## Test Mapping

- `tests/ui/render.test.ts`: `VWT-TABS-001`, `VWT-TABS-003`
- `tests/ui/bootstrap.test.ts`: `VWT-TABS-002`, `VWT-BRIDGE-001`, `VWT-TABS-004`
