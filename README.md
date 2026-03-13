# visual-aid

## Purpose

`visual-aid` is a Tauri application that gives coding agents a dedicated way to present structured information to users as visual output.

Agents should be able to launch the app and send it structured payloads over MCP. The app then renders those payloads in a form that is easy for a user to inspect and understand.

## What The App Should Support

The visual aid is intended for structured formats such as:

- Markdown
- Unified diff
- Mermaid
- Excalidraw
- HTML

The set of supported formats can grow over time as new agent workflows emerge.

## Core Idea

Instead of forcing every piece of agent-generated content into plain terminal text, this project provides a separate visual surface for content that benefits from richer rendering.

That means an agent can:

1. Launch the visual aid.
2. Send structured data to it through MCP.
3. Let the app render an appropriate visual representation for the user.

## Direction

This project starts as the foundation for an agent-facing visualization tool:

- The agent is the producer of structured content.
- MCP is the communication layer between the agent and the app.
- The Tauri app is the renderer for the user-facing visual representation.

The goal is a simple, reliable path from agent output to a visual experience that helps users understand code, changes, diagrams, and other structured artifacts more clearly.

## Documentation Framework

This project is intended to be built and maintained primarily by a coding agent. To support that workflow, project knowledge should live in markdown files that are easy to inspect, update, and review.

The baseline document set is:

- [docs/agent-workflow.md](/Users/max/projects/mantoni/visual-aid/docs/agent-workflow.md): operating rules for agent-driven work in this repository
- [docs/architecture.md](/Users/max/projects/mantoni/visual-aid/docs/architecture.md): current system shape and technical boundaries
- [docs/product.md](/Users/max/projects/mantoni/visual-aid/docs/product.md): product intent, scope, and milestone direction
- [docs/decisions/README.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/README.md): how decisions are recorded
- [docs/decisions/0001-markdown-first-agent-workflow.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0001-markdown-first-agent-workflow.md): first architectural decision record
- [docs/decisions/0002-initial-mcp-contract-and-payload-envelope.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0002-initial-mcp-contract-and-payload-envelope.md): initial app control contract and payload shape
- [docs/decisions/0003-initial-scaffold-stack-and-layout.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0003-initial-scaffold-stack-and-layout.md): initial implementation stack and repository layout
- [docs/decisions/0004-initial-file-based-session-bridge.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0004-initial-file-based-session-bridge.md): initial live bridge between MCP and the desktop app

## Documentation Rules

- Significant product, architecture, and process decisions must be captured as markdown before or alongside implementation.
- When a decision changes prior direction, the relevant decision record and affected documents must be updated in the same change.
- The markdown documents are the primary project memory for future agent work.
