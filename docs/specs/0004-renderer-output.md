# Spec 0004: Renderer Output

## Purpose

Define the visible renderer behavior for the current payload area, history list, metadata panel, and empty states.

Related decisions:

- [0002-initial-mcp-contract-and-payload-envelope.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0002-initial-mcp-contract-and-payload-envelope.md)
- [0005-documentation-integrated-testing.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0005-documentation-integrated-testing.md)
- [0011-isolated-html-fragments.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0011-isolated-html-fragments.md)

## Preconditions

- The renderer receives a `VisualAidState` containing a session and status string.
- The current payload is the selected session item, defaulting to the newest item in the session list.
- HTML payloads are treated as fragment content rendered in an isolated HTML surface.

## Invariants

- Empty sessions show explicit empty-state messaging.
- The current payload panel reflects the selected session item.
- History is shown in reverse chronological order with the selected item marked active.
- HTML payloads render inside a sandboxed iframe surface rather than the host DOM.
- Metadata is rendered in a stable JSON key order for the selected payload.

## Scenarios

### VAR-EMPTY-001 Empty sessions show waiting and empty states

Given a renderer state with no session items
When the renderer output is generated
Then the current payload title is `Waiting For Payloads`
And the empty-state message is visible

### VAR-MARKDOWN-001 Markdown payloads render in the markdown container

Given a renderer state with a markdown payload
When the renderer output is generated
Then the current payload content appears inside `.payload-markdown`
And the format chip reads `Markdown`

### VAR-HTML-001 HTML payloads render as isolated fragments

Given a renderer state with an HTML payload
When the renderer output is generated
Then the payload appears inside a sandboxed HTML iframe
And the payload markup is stored in the iframe document source rather than injected into the host DOM

### VAR-HISTORY-001 History is reverse chronological with the newest item active

Given a renderer state with multiple session items
When the renderer output is generated
Then the first history item corresponds to the newest payload
And that history item has the active state class

### VAR-HISTORY-002 The current payload reflects the selected history item

Given a renderer state with multiple session items and the older item selected
When the renderer output is generated
Then the current payload title matches the selected older item
And the matching history item has the active state class

### VAR-META-001 Metadata renders in a stable key order

Given a renderer state with payload metadata
When the renderer output is generated
Then the metadata panel renders JSON for the selected payload
And the metadata keys appear in a stable sorted order

## Test Mapping

- `tests/ui/render.test.ts`: `VAR-EMPTY-001`, `VAR-MARKDOWN-001`, `VAR-HTML-001`, `VAR-HISTORY-001`, `VAR-HISTORY-002`, `VAR-META-001`
