# 0023: Source Code Rendering

## Status

Accepted

## Context

The project already renders Markdown, diff, JSON, Mermaid, Excalidraw, and HTML payloads, but it still lacks a first-class renderer for plain source code.

That gap forces agents to either wrap code inside Markdown fences or send raw preformatted text, both of which make code inspection weaker than it should be. At the same time, Markdown fenced code blocks are still rendered as plain escaped text even when a language is declared.

## Decision

The renderer adds a dedicated `code` payload format and uses shared syntax highlighting for both source code payloads and Markdown fenced code blocks.

Specifically:

- `visual-aid.show` accepts `format: "code"` as a first-class payload type
- the source code renderer displays code in a dedicated code viewer instead of a generic pre block
- source code payloads may supply `metadata.language` to control the syntax highlighter and visible label
- Markdown fenced code blocks use the same syntax highlighting path, while still rendering inside the Markdown document view
- when no language is supplied, the renderer may fall back to automatic language detection or plain escaped code

## Consequences

Positive consequences:

- agents can send standalone source code without wrapping it in Markdown
- code inspection becomes more readable through syntax highlighting
- Markdown explanations that embed code now render those code blocks more faithfully

Costs and constraints:

- the frontend now depends on a dedicated syntax-highlighting library
- highlighting accuracy depends on declared languages or the quality of automatic detection
- `metadata.language` remains advisory rather than becoming a strict schema field
