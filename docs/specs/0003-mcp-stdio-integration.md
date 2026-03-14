# Spec 0003: MCP Stdio Integration

## Purpose

Define the expected end-to-end behavior of the MCP server when a real MCP client connects over stdio.

Related decisions:

- [0002-initial-mcp-contract-and-payload-envelope.md](../decisions/0002-initial-mcp-contract-and-payload-envelope.md)
- [0004-initial-file-based-session-bridge.md](../decisions/0004-initial-file-based-session-bridge.md)
- [0005-documentation-integrated-testing.md](../decisions/0005-documentation-integrated-testing.md)

## Preconditions

- The MCP server is started through the stdio transport.
- The client uses the MCP SDK to initialize and call tools.
- The session file path may be overridden per test run.

## Invariants

- The server advertises the documented tool surface.
- Successful tool calls update the session file according to the behavior spec.
- Invalid tool input is rejected by the registered input schema and returned as an MCP error result.

## Scenarios

### VAI-LIST-001 MCP server exposes the documented tools

Given a connected MCP client
When the client lists tools
Then the tool names include `visual-aid.status`, `visual-aid.open`, `visual-aid.show`, and `visual-aid.clear`

### VAI-SHOW-001 Show writes the session file through a real MCP call

Given a connected MCP client and an empty session path
When the client calls `visual-aid.show` with a valid markdown payload
Then the session file contains exactly one markdown item
And the session `lastAction` is `show`

### VAI-CLEAR-001 Clear empties the session file through a real MCP call

Given a connected MCP client and a populated session file
When the client calls `visual-aid.clear`
Then the session file contains zero items
And the session `lastAction` is `clear`

### VAI-SHOW-002 Show accepts JSON payloads through a real MCP call

Given a connected MCP client and an empty session path
When the client calls `visual-aid.show` with a valid JSON payload
Then the session file contains exactly one JSON item
And the session `lastAction` is `show`

### VAI-VALIDATION-001 Invalid show payloads are rejected

Given a connected MCP client
When the client calls `visual-aid.show` with an unsupported format
Then the result is marked as an error
And the returned text mentions input validation

## Test Mapping

- `tests/mcp/integration.test.ts`: `VAI-LIST-001`, `VAI-SHOW-001`, `VAI-CLEAR-001`, `VAI-SHOW-002`, `VAI-VALIDATION-001`
