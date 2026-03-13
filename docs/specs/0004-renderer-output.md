# Spec 0004: Renderer Output

## Purpose

Define the visible renderer behavior for the current payload area, history list, metadata panel, and empty states.

Related decisions:

- [0002-initial-mcp-contract-and-payload-envelope.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0002-initial-mcp-contract-and-payload-envelope.md)
- [0005-documentation-integrated-testing.md](/Users/max/projects/mantoni/visual-aid/docs/decisions/0005-documentation-integrated-testing.md)

## Preconditions

- The renderer receives a `VisualAidState` containing a session and status string.
- The current payload is the last item in the session item list.
- HTML payloads are rendered as HTML, while non-HTML payloads are rendered in preformatted code blocks.

## Invariants

- Empty sessions show explicit empty-state messaging.
- The current payload panel reflects the newest session item.
- History is shown in reverse chronological order with the newest item marked active.
- HTML payloads render as HTML content, not escaped text.

## Scenarios

### VAR-EMPTY-001 Empty sessions show waiting and empty states

Given a renderer state with no session items
When the renderer output is generated
Then the current payload title is `Waiting For Payloads`
And the empty-state message is visible

### VAR-MARKDOWN-001 Markdown payloads render in a preformatted block

Given a renderer state with a markdown payload
When the renderer output is generated
Then the current payload content appears inside `.payload-pre`
And the format chip reads `Markdown`

### VAR-HTML-001 HTML payloads render as HTML content

Given a renderer state with an HTML payload
When the renderer output is generated
Then the payload appears inside `.payload-html`
And embedded markup is present in the DOM

### VAR-HISTORY-001 History is reverse chronological with the newest item active

Given a renderer state with multiple session items
When the renderer output is generated
Then the first history item corresponds to the newest payload
And that history item has the active state class

## Test Mapping

- `tests/ui/render.test.ts`: `VAR-EMPTY-001`, `VAR-MARKDOWN-001`, `VAR-HTML-001`, `VAR-HISTORY-001`
