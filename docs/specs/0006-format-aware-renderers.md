# Spec 0006: Format-Aware Renderers

## Purpose

Define the visible semantics of the first renderer pass for each supported payload format.

Related decisions:

- [0002-initial-mcp-contract-and-payload-envelope.md](../decisions/0002-initial-mcp-contract-and-payload-envelope.md)
- [0006-initial-format-aware-renderers.md](../decisions/0006-initial-format-aware-renderers.md)
- [0023-source-code-rendering.md](../decisions/0023-source-code-rendering.md)
- [0029-explicit-payload-fields-no-arbitrary-metadata.md](../decisions/0029-explicit-payload-fields-no-arbitrary-metadata.md)

## Preconditions

- The renderer receives a valid payload format from the version `1` envelope.
- The output is generated in the current payload panel.
- The renderer favors lightweight format-specific presentation with readable fallbacks when a richer view cannot be produced.

## Invariants

- Markdown uses semantic document structure instead of a raw pre block when possible.
- Markdown preserves richer document structure such as ordered lists, blockquotes, tables, links, sanitized raw HTML snippets, syntax-highlighted fenced code blocks, embedded Mermaid fences, and embedded diff fences.
- Source code payloads render in a dedicated syntax-highlighted code viewer with an optional language label.
- JSON payloads expose parsed structure when valid and keep a readable raw fallback when invalid.
- Diff lines are visually classified by their line prefix and role.
- Mermaid payloads attempt to render as diagrams while keeping their source available.
- HTML payloads still render as direct markup.

## Scenarios

### VFR-MARKDOWN-001 Markdown headings and lists render semantically

Given a markdown payload with headings and bullet items
When the renderer output is generated
Then headings are rendered as heading elements
And bullet items are rendered inside a list

### VFR-MARKDOWN-002 Markdown renders richer document structure

Given a markdown payload with a blockquote, ordered list, table, link, and fenced code block
When the renderer output is generated
Then the output includes semantic blockquote, ordered-list, table, and anchor elements
And fenced code is rendered in a dedicated syntax-highlighted code block with its language label visible when supplied

### VFR-MARKDOWN-003 Markdown Mermaid fences render as embedded diagrams

Given a markdown payload with a fenced code block whose language is `mermaid`
When the renderer output is generated
Then the markdown output includes an embedded Mermaid frame
And the Mermaid source remains available for inspection inside the markdown view

### VFR-MARKDOWN-004 Markdown Mermaid fences fall back to source when rendering fails

Given a markdown payload with a fenced code block whose language is `mermaid`
When the renderer attempts to hydrate the embedded Mermaid view and rendering fails
Then the markdown output shows a readable fallback message
And the Mermaid source is visible for inspection inside the markdown view

### VFR-MARKDOWN-005 Markdown diff fences render as embedded diff views

Given a markdown payload with a fenced code block whose language is `diff`
When the renderer output is generated
Then the markdown output includes an embedded diff view
And diff lines are classified by file, hunk, add, remove, and context roles inside the markdown view

### VFR-MARKDOWN-006 Markdown raw HTML snippets render as sanitized HTML

Given a markdown payload that includes inline or block raw HTML
When the renderer output is generated
Then the HTML snippets render inside the markdown view
And unsafe elements such as scripts are removed rather than executed

### VFR-CODE-001 Source code payloads render with syntax highlighting

Given a source code payload with an explicit `language` field
When the renderer output is generated
Then the payload is rendered in a dedicated code viewer
And the source code is syntax highlighted with the language label visible

### VFR-DIFF-001 Diff lines are classified by line type

Given a unified diff payload
When the renderer output is generated
Then added and removed lines render with different diff line classes
And hunk lines are marked separately

### VFR-JSON-001 JSON payloads render a parsed tree and raw preview

Given a valid JSON payload
When the renderer output is generated
Then the viewer shows a parsed tree representation of the JSON structure
And a raw JSON preview remains available

### VFR-JSON-002 Invalid JSON payloads show a readable fallback

Given an invalid JSON payload
When the renderer output is generated
Then the UI shows that the payload could not be parsed
And the raw JSON text remains visible for inspection

### VFR-MERMAID-001 Mermaid payloads render as diagrams when rendering succeeds

Given a mermaid payload
When the renderer output is generated
Then the viewer includes a rendered diagram
And the Mermaid source remains available in the payload view

### VFR-MERMAID-002 Mermaid payloads fall back to source when rendering fails

Given a mermaid payload that cannot be rendered
When the renderer attempts to hydrate the payload view
Then the UI shows a readable fallback message
And the Mermaid source is visible for inspection

## Test Mapping

- `tests/ui/render.test.ts`: `VFR-MARKDOWN-001`, `VFR-MARKDOWN-002`, `VFR-MARKDOWN-003`, `VFR-MARKDOWN-005`, `VFR-MARKDOWN-006`, `VFR-CODE-001`, `VFR-DIFF-001`, `VFR-JSON-001`, `VFR-JSON-002`
- `tests/ui/mermaid.test.ts`: `VFR-MERMAID-001`, `VFR-MERMAID-002`, `VFR-MARKDOWN-003`, `VFR-MARKDOWN-004`
