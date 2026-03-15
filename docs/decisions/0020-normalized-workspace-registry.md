# 0020: Normalized Workspace Registry

## Status

Accepted

## Context

Workspace tabs introduced a shared registry file so the desktop app could discover multiple working directories inside one window.

The first implementation stored both:

- workspace identity and session path metadata in the registry
- a full embedded copy of each workspace session in that same registry

That duplicated the active session content between the per-workspace session file and the shared registry file. The duplication made the registry heavier, created two disk copies of the same payload history, and blurred which file was authoritative for session content.

The project needs the registry to stay useful for workspace discovery without turning it into a second session store.

## Decision

The shared registry stores workspace references only.

Specifically:

- each registry entry keeps the workspace id, cwd, label, and session path
- the per-workspace session file remains the only authoritative live source for session content
- the desktop host assembles renderer-facing workspace state by reading the registry and then loading each referenced session file
- the desktop host may fall back to a persisted last known good workspace-state snapshot when a referenced live session file is missing or unreadable

This keeps the renderer contract unchanged while removing duplicated live session payloads from the registry file.

## Consequences

Positive consequences:

- workspace discovery remains centralized in one shared registry file
- live session content has a single authoritative on-disk source
- registry writes stay smaller and easier to inspect
- desktop restore still works without asking the MCP server to resend content

Costs and constraints:

- the desktop host now owns the composition step that joins registry entries with session files
- restore behavior depends on the host preserving a workspace-state snapshot alongside the registry
- debugging desktop state now requires checking both the registry file and the referenced session file when a workspace looks stale
