# Spec 0007: MCP Diagnostics

## Purpose

Define a minimal diagnostic surface that makes MCP host integration observable through both tools and resources.

Related decisions:

- [0005-documentation-integrated-testing.md](../decisions/0005-documentation-integrated-testing.md)

## Preconditions

- The MCP server is running over stdio.
- The session file path is known to the server.
- The current session can be read without mutating state.

## Invariants

- `visual-aid.status` returns a human-readable diagnostic summary.
- `visual-aid.status` does not mutate the session file.
- `visual-aid.status` reports the resolved workspace path and its resolution source.
- `visual-aid.status` may accept an explicit `cwd` argument to inspect another workspace.
- `visual-aid://status` is listed as a readable resource.
- Reading `visual-aid://status` returns JSON text with server, session, and workspace information.

## Scenarios

### VDI-TOOL-001 Status tool returns server and session diagnostics

Given a connected MCP client
When the client calls `visual-aid.status`
Then the response text includes the server name and session path
And the response text includes the resolved workspace path and workspace resolution source

### VDI-RESOURCE-001 Status resource is listed and readable

Given a connected MCP client
When the client lists and reads resources
Then `visual-aid://status` is present
And the resource contents include session and workspace diagnostics as JSON text

## Test Mapping

- `tests/mcp/diagnostics.test.ts`: `VDI-TOOL-001`, `VDI-RESOURCE-001`
