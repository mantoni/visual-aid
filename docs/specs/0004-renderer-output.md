# Spec 0004: Renderer Output

## Purpose

Define the visible renderer behavior for the splash state, current payload area, compact toolbar, and recents sheet.

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
- The current payload view reflects the selected session item.
- The active shell uses a compact toolbar instead of in-content app branding or global status copy.
- History is available from a toggleable recents sheet and is shown in reverse chronological order with the selected item marked active.
- The recents sheet stays anchored to the sticky toolbar instead of scrolling away with the document content.
- The recents sheet uses the same translucent blurred glass treatment as the sticky toolbar.
- On narrow screens, the recents toggle remains on the toolbar's top row and stays aligned to the right.
- HTML payloads render inside a sandboxed iframe surface rather than the host DOM.
- HTML payloads size their iframe to the available document viewport height so the iframe remains the scrolling surface and the outer document shell avoids a scrollbar.

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

### VAR-HTML-002 HTML payloads fill the available document viewport

Given a renderer state with an HTML payload
When the HTML iframe finishes loading or the document viewport height changes
Then the iframe height matches the available document viewport height
And the iframe remains the scrolling surface for the payload
And the outer document shell avoids a scrollbar for the HTML payload

### VAR-HISTORY-001 History is reverse chronological with the newest item active

Given a renderer state with multiple session items
When the renderer output is generated
Then the first history item corresponds to the newest payload
And that history item has the active state class

### VAR-LAYOUT-001 Payload sessions show a document viewer and compact recents control

Given a renderer state with a current payload
When the renderer output is generated
Then the payload viewer surface is visible
And the recents toggle is visible
And no in-content app status block is rendered

### VAR-HISTORY-002 The current payload reflects the selected history item

Given a renderer state with multiple session items and the older item selected
When the renderer output is generated
Then the current payload title matches the selected older item
And the matching history item has the active state class

### VAR-HISTORY-003 Recents are hidden until the user opens them

Given a renderer state with a current payload and multiple session items
When the renderer output is generated
Then the recents toggle reports a collapsed state
And the recents sheet is not open

### VAR-LAYOUT-002 The recents sheet is anchored to the sticky toolbar

Given a renderer state with a current payload and open recents
When the renderer output is generated
Then the recents sheet is rendered outside the scrolling document stage
And the recents sheet remains anchored below the sticky toolbar

### VAR-LAYOUT-003 Narrow-screen toolbar rules keep recents on the top row

Given the renderer stylesheet for payload sessions
When the narrow-screen toolbar rules are inspected
Then the toolbar keeps a two-column top row with workspace tabs on the left
And the recents control remains in the right-hand toolbar actions region

### VAR-LAYOUT-004 The recents sheet reuses the toolbar glass styling

Given the renderer stylesheet for payload sessions
When the recents sheet rules are inspected
Then the sheet uses the shared document glass background
And the sheet uses the same backdrop blur recipe as the sticky toolbar

## Test Mapping

- `tests/ui/render.test.ts`: `VAR-EMPTY-001`, `VAR-MARKDOWN-001`, `VAR-CODE-001`, `VAR-HTML-001`, `VAR-HTML-002`, `VAR-HISTORY-001`, `VAR-LAYOUT-001`, `VAR-HISTORY-002`, `VAR-HISTORY-003`, `VAR-LAYOUT-002`
- `tests/ui/styles.test.ts`: `VAR-LAYOUT-003`, `VAR-LAYOUT-004`
