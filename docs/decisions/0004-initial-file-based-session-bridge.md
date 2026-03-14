# 0004: Initial File-Based Session Bridge

## Status

Accepted

## Context

The project has an MCP server scaffold and a Tauri application scaffold, but not yet a direct runtime message channel between them.

The next implementation step needs a practical way for `visual-aid.show` and `visual-aid.clear` to affect the desktop UI without introducing avoidable complexity too early.

## Decision

The initial bridge between the MCP server and the desktop app will use a shared session file.

Specifically:

- the MCP server writes the active session state to a JSON file
- the Tauri host exposes a command that reads the session file
- the frontend polls that command and updates the displayed content when the session changes

The session file path may be supplied explicitly or through environment configuration. If not supplied, the development default is the repository-local `.visual-aid/session.json`.

## Consequences

Positive consequences:

- the desktop UI can become live without waiting for a more advanced bridge
- the MCP server and Tauri host remain loosely coupled in the early phase
- the current payload envelope does not need to change

Costs and constraints:

- polling is less efficient than a push-based bridge
- file path coordination must be handled carefully across environments
- the session file becomes an implementation detail that will likely be replaced later

The frontend-polling portion of this decision is superseded by [0012-push-based-session-bridge.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0012-push-based-session-bridge.md).
