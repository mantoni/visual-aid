# 0014: Single-Window Workspace Tabs

## Status

Accepted

## Context

The current renderer supports one session history at a time, with a single main viewer and a history sidebar.

That is sufficient for the earliest workflow, but it is too limited for everyday use across multiple working directories. At the same time, the product does not want to expand into a multi-window desktop model.

## Decision

Future multi-session browsing will stay inside a single app window and use workspace tabs.

Specifically:

- the app keeps one main window as the primary interface
- each tab represents a working directory
- tabs appear at the top of the window
- users can close, rename, and reorder tabs

This defines the intended direction for richer session browsing without changing the current single-session implementation yet.

## Consequences

Positive consequences:

- users can keep multiple working contexts visible without juggling windows
- the app gains a clearer mental model for project-scoped sessions
- future session persistence can align with workspace identity rather than an undifferentiated global list

Costs and constraints:

- the session model will need to grow beyond the current single active-session view
- tab persistence, rename semantics, and reorder behavior will need explicit specs before implementation
- the product intentionally excludes multi-window support from this direction
