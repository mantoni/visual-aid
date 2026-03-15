# 0027: Remove Excalidraw Format

## Status

Accepted

## Context

The project now treats Markdown as the primary composition surface for mixed artifacts, with richer embedded viewers for formats such as Mermaid and diff.

Excalidraw no longer fits that direction well. Agents reliably produce Markdown, diffs, code, JSON, and Mermaid, but Excalidraw payloads are harder for agents to generate and revise cleanly. In practice this repository never implemented a true Excalidraw viewer. The existing `excalidraw` support only exposed a small JSON summary plus raw payload preview, which added contract and maintenance surface without delivering comparable user value.

## Decision

The shared payload contract and renderer remove `excalidraw` as a first-class format.

Specifically:

- the MCP payload schema no longer accepts `format: "excalidraw"`
- the renderer removes the Excalidraw-specific summary view
- the product documentation and behavior specs no longer describe Excalidraw as a supported format
- Markdown remains the preferred composition surface for mixed prose plus embedded visual artifacts

## Consequences

Positive consequences:

- the payload contract is smaller and better aligned with formats agents actually produce well
- the renderer surface loses a low-value special case
- documentation and tests better match the real product direction

Costs and constraints:

- users can no longer send Excalidraw scene JSON as a dedicated format
- if sketch-like diagrams become important later, the project will need either a real Excalidraw viewer or a different first-class diagram format decision
