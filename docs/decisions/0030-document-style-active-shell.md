# 0030: Document-Style Active Shell

## Status

Accepted

## Context

The active renderer shell still devoted too much space to shell chrome. Branding, status copy, large panel headers, and a persistent history sidebar made the app feel closer to a dashboard than a native document viewer.

That conflicted with the product goal for `visual-aid`: the payload should be the main object in the window, while navigation remains available but secondary.

This decision supersedes the active-session shell layout described in [0028-app-shell-splash-and-theme.md](0028-app-shell-splash-and-theme.md) while keeping that decision's splash-state and system-theme direction.

## Decision

For non-empty sessions, the desktop renderer now uses a document-style shell.

Specifically:

- the active shell removes the in-content app branding and global status block
- the top chrome becomes a compact toolbar with workspace switching, current payload title, format chip, and a `Recents` toggle
- payload history moves from a persistent sidebar to a toggleable slide-over sheet
- the primary viewer surface expands to occupy most of the window
- the branded splash state remains separate for empty sessions

The MCP transport, payload envelope, and per-workspace session model do not change.

## Consequences

Positive consequences:

- active sessions feel closer to a native document app
- payload content gets materially more space on screen
- multi-workspace switching and history stay available without dominating the layout

Costs and constraints:

- the renderer now keeps local UI state for the recents sheet
- interactive tests must cover the recents toggle behavior
- splash-state branding remains intentionally different from the quieter active-content shell
