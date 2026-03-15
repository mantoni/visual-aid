# Spec 0004: Renderer Output

## Purpose

Define the visible renderer behavior for the splash state, current payload area, and history list.

Related decisions:

- [0002-initial-mcp-contract-and-payload-envelope.md](../decisions/0002-initial-mcp-contract-and-payload-envelope.md)
- [0005-documentation-integrated-testing.md](../decisions/0005-documentation-integrated-testing.md)
- [0011-isolated-html-fragments.md](../decisions/0011-isolated-html-fragments.md)
- [0029-explicit-payload-fields-no-arbitrary-metadata.md](../decisions/0029-explicit-payload-fields-no-arbitrary-metadata.md)

## Preconditions

- The renderer receives a `VisualAidState` containing a session and status string.
- The current payload is the selected session item, defaulting to the newest item in the session list.
- HTML payloads are treated as fragment content rendered in an isolated HTML surface.

## Invariants

- Empty sessions show a branded splash screen rather than the payload viewer panels.
- The current payload panel reflects the selected session item.
- History is shown in reverse chronological order with the selected item marked active.
- HTML payloads render inside a sandboxed iframe surface rather than the host DOM.

## Scenarios

### VAR-EMPTY-001 Empty sessions show the branded splash state

Given a renderer state with no session items
When the renderer output is generated
Then the splash title is `Visual AId`
And the splash waiting message is visible
And the payload viewer panel is not rendered

### VAR-MARKDOWN-001 Markdown payloads render in the markdown container

Given a renderer state with a markdown payload
When the renderer output is generated
Then the current payload content appears inside `.payload-markdown`
And the format chip reads `Markdown`

### VAR-CODE-001 Source code payloads render in the code container

Given a renderer state with a source code payload
When the renderer output is generated
Then the current payload content appears inside `.payload-code`
And the format chip reads `Source Code`

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

### VAR-LAYOUT-001 Payload sessions show viewer and history without a metadata panel

Given a renderer state with a current payload
When the renderer output is generated
Then the payload viewer panel is visible
And the history panel is visible
And no metadata panel is rendered

### VAR-HISTORY-002 The current payload reflects the selected history item

Given a renderer state with multiple session items and the older item selected
When the renderer output is generated
Then the current payload title matches the selected older item
And the matching history item has the active state class

## Test Mapping

- `tests/ui/render.test.ts`: `VAR-EMPTY-001`, `VAR-MARKDOWN-001`, `VAR-CODE-001`, `VAR-HTML-001`, `VAR-HISTORY-001`, `VAR-LAYOUT-001`, `VAR-HISTORY-002`
