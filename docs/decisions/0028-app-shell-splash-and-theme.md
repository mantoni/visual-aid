# 0028: App Shell Splash And Theme

## Status

Accepted, partially superseded by [0030-document-style-active-shell.md](0030-document-style-active-shell.md)

## Context

The renderer shell had an intentionally loud hero header and a dark-only presentation. That worked for the first scaffold, but it no longer matched the product goal of a calm, app-like inspection surface for agent output.

The desktop shell also needed a clearer startup state. When the app opened with no rendered payloads yet, the old layout still showed the payload viewer framing with placeholder copy instead of a true welcome screen.

## Decision

The desktop renderer shell now uses a compact app chrome plus a dedicated splash state.

Specifically:

- the large top hero header is removed from the main shell
- the visible app branding uses `Visual AId` in the desktop title and shell copy
- empty sessions render a branded splash screen instead of the payload viewer panels
- once a payload exists, the shell switches away from the splash state into the active payload shell
- the desktop shell follows the system light or dark color scheme and updates when that preference changes

The MCP tool names, repository name, and internal identifiers remain `visual-aid`. This decision only changes the user-facing desktop shell and branding.

## Consequences

Positive consequences:

- startup feels intentional instead of looking like an unfinished empty panel layout
- the renderer reads more like a desktop app and less like a landing page
- light-mode support makes the app fit better into host desktop preferences

Costs and constraints:

- the shell CSS now has a larger theming surface to maintain
- renderer tests must assert splash-state behavior instead of the old empty viewer copy
- visible branding now differs from some internal identifiers, so docs must stay explicit about that split
