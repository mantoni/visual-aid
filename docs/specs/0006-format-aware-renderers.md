# Spec 0006: Format-Aware Renderers

## Purpose

Define the visible semantics of the first renderer pass for each supported payload format.

Related decisions:

- [0002-initial-mcp-contract-and-payload-envelope.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0002-initial-mcp-contract-and-payload-envelope.md)
- [0006-initial-format-aware-renderers.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0006-initial-format-aware-renderers.md)

## Preconditions

- The renderer receives a valid payload format from the version `1` envelope.
- The output is generated in the current payload panel.
- The first renderer pass favors specialized HTML structure over full external rendering engines.

## Invariants

- Markdown uses semantic document structure instead of a raw pre block when possible.
- Diff lines are visually classified by their line prefix and role.
- Mermaid payloads are shown in a dedicated diagram-source frame.
- Excalidraw payloads expose parsed canvas metadata when valid JSON is provided.
- HTML payloads still render as direct markup.

## Scenarios

### VFR-MARKDOWN-001 Markdown headings and lists render semantically

Given a markdown payload with headings and bullet items
When the renderer output is generated
Then headings are rendered as heading elements
And bullet items are rendered inside a list

### VFR-DIFF-001 Diff lines are classified by line type

Given a unified diff payload
When the renderer output is generated
Then added and removed lines render with different diff line classes
And hunk lines are marked separately

### VFR-MERMAID-001 Mermaid payloads render in a diagram-source viewer

Given a mermaid payload
When the renderer output is generated
Then the viewer includes a mermaid-specific container
And the source text remains visible

### VFR-EXCALIDRAW-001 Excalidraw payloads show parsed summary details

Given a valid excalidraw JSON payload
When the renderer output is generated
Then the viewer shows an element count summary
And the raw JSON preview remains visible

## Test Mapping

- `tests/ui/render.test.ts`: `VFR-MARKDOWN-001`, `VFR-DIFF-001`, `VFR-MERMAID-001`, `VFR-EXCALIDRAW-001`
