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
