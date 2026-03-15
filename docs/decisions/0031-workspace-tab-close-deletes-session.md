# 0031: Workspace Tab Close Deletes Session

## Status

Accepted

## Context

Workspace tabs already exposed close controls, but the renderer treated close as local UI state only.

That created two problems:

- closing a tab did not remove the workspace session from disk or from the shared registry
- the last remaining workspace rendered as a non-closeable pill, so the window could not be fully cleared through tab close

The product needs workspace close to behave like a real session dismissal rather than a temporary local hide.

## Decision

Closing a workspace tab deletes that workspace session and removes its registry entry, including when it is the last visible tab.

Specifically:

- the desktop host owns workspace-tab close mutations because it already owns registry composition and persisted restore behavior
- the renderer invokes the host close command and updates from the returned workspace state
- the host deletes the workspace session file when present
- the host rewrites the shared registry without the closed workspace and recalculates the active workspace
- when the closed workspace is the last remaining one, the window returns to the empty splash state

The MCP tool surface does not change.

## Consequences

Positive consequences:

- closed workspaces stay gone across bridge updates and app restarts
- users can dismiss the final remaining tab without using `visual-aid.clear`
- persisted restore no longer resurrects a workspace that was explicitly closed

Costs and constraints:

- the Tauri host now owns a destructive workspace mutation path and must keep persisted state in sync
- renderer tests and host tests must cover both multi-tab close and last-tab close behavior
