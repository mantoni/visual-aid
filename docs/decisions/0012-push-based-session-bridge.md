# 0012: Push-Based Session Bridge

## Status

Accepted

## Context

The current file-based bridge already keeps the MCP payload envelope stable and lets the desktop app recover session state from disk.

What it still does poorly is delivery timing. The renderer currently polls the host once per second to discover session changes. That adds avoidable latency, repeated disk reads, and extra bridge churn to every workflow even though the host is better positioned to observe the session file directly.

The project needs a bridge step that preserves the shared session file but makes renderer updates event-driven.

## Decision

The desktop bridge remains file-based, but renderer updates become push-based.

Specifically:

- the Tauri host watches the configured session path for file changes
- when the session changes, the host reads the current session state and emits a renderer event with the session payload
- the frontend performs one initial session read at startup, then listens for host-emitted session updates
- duplicate session snapshots are suppressed in the frontend bridge layer

This keeps the MCP contract and session file model unchanged while reducing update latency and redundant polling.

## Consequences

Positive consequences:

- desktop updates become effectively immediate after MCP writes
- the renderer stops re-reading the session file on a fixed interval
- the bridge remains compatible with the persisted-session recovery model

Costs and constraints:

- the host now owns a file watcher lifecycle in addition to session reads
- file-watch behavior must handle create, replace, and remove events reliably
- this supersedes the frontend polling portion of [0004-initial-file-based-session-bridge.md](0004-initial-file-based-session-bridge.md)
