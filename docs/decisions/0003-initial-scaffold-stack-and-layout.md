# 0003: Initial Scaffold Stack And Layout

## Status

Accepted

## Context

The project now needs an implementation scaffold that is simple enough to start quickly, but structured enough to support the documented agent-to-app contract.

The scaffold should separate:

- the user-facing renderer UI
- the desktop application host
- the MCP-facing control surface

## Decision

The initial scaffold will use:

- Vite with vanilla TypeScript for the renderer frontend
- Tauri v2 for the desktop application shell
- a Node-based MCP server for the initial `visual-aid.open`, `visual-aid.show`, and `visual-aid.clear` tool surface

The repository layout will start with:

- `src/` for frontend application code
- `mcp/` for the MCP server and shared payload validation used on the Node side
- `src-tauri/` for the Tauri host application
- `docs/` for product, architecture, and decision records

## Consequences

Positive consequences:

- the scaffold stays small and understandable
- the frontend can iterate quickly without a heavy framework
- the MCP server can evolve independently from the Tauri host internals

Costs and constraints:

- Rust tooling is still required to run the desktop app locally
- shared contracts may need to be duplicated or abstracted carefully between Node and Rust in the early phase
- the frontend starts intentionally minimal and may need refactoring as the renderer set grows
