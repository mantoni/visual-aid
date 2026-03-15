# 0033: Self-Describing MCP Surface

## Status

Accepted

## Context

`visual-aid` is meant to be used by coding agents, including agents that have no repository context beyond what the MCP protocol itself exposes.

The existing server name, tool names, and top-level descriptions made the broad purpose visible, but they did not explain the payload fields well enough for an arbitrary agent to understand `visual-aid.show` immediately. The only readable resource was a diagnostic status document, which helped with debugging but not onboarding.

## Decision

The MCP discovery surface should be self-describing enough that an arbitrary agent can understand the server's purpose and basic usage from MCP metadata alone.

Specifically:

- tool titles and descriptions should explain the user-facing intent of each operation, not only the internal storage effect
- tool annotations should mark obvious read-only, idempotent, and destructive behavior when that helps an agent choose safely
- input schemas should include field-level descriptions for the shared payload envelope and workspace override arguments
- the server should expose a fixed readable usage resource alongside diagnostics

The fixed usage resource is:

- `visual-aid://usage`: markdown guidance that explains when to use `visual-aid`, what each tool does, and how to shape a `visual-aid.show` payload

## Consequences

Positive consequences:

- agents can infer the server's purpose and payload contract without reading repository markdown
- tool selection becomes safer because discovery metadata identifies read-only and destructive operations
- onboarding guidance is available over MCP itself instead of only through repository docs

Costs and constraints:

- the protocol surface now includes user-facing copy that must stay aligned with product behavior
- future payload fields and tool behavior changes must update schema descriptions and the usage resource together
