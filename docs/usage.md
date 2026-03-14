# Usage

## Purpose

Explain how to use `visual-aid` as a local desktop surface for structured agent output.

## Mental Model

`visual-aid` has three moving parts:

- the desktop app, which renders payloads
- the MCP server, which accepts `visual-aid.*` tool calls
- the shared session file, which connects the two

The default local workflow uses `.visual-aid/dev-session.json` as that shared session file.

## Canonical Local Flow

1. Start the app with `npm start`.
2. Point Codex at the same session file with `npm start -- --print-codex-config`.
3. Use the MCP tools to open, render, inspect, and clear payloads.

The printed Codex config block is the safest way to avoid mismatched session paths.

## MCP Tools

`visual-aid` exposes four tools:

- `visual-aid.status`: show MCP and session diagnostics
- `visual-aid.open`: launch or focus the app
- `visual-aid.show`: render a structured payload
- `visual-aid.clear`: clear the active session

## Common Payload Types

The app currently supports:

- `markdown`
- `json`
- `diff`
- `mermaid`
- `excalidraw`
- `html`

Use `visual-aid` when the artifact is easier to inspect visually than in terminal text alone, such as:

- plans and long explanations in Markdown
- nested data in JSON
- code changes in unified diff
- diagrams in Mermaid
- sketches in Excalidraw JSON
- fragment-oriented UI previews in HTML

## Example Workflow

Start the app:

```sh
npm start
```

Print the matching Codex config:

```sh
npm start -- --print-codex-config
```

Then call these tools from your MCP client:

1. `visual-aid.status`
2. `visual-aid.open`
3. `visual-aid.show` with a payload
4. `visual-aid.clear` when you want to reset the current surface

## Example Payloads

Markdown:

```json
{
  "version": 1,
  "format": "markdown",
  "title": "Plan",
  "summary": "Current implementation plan",
  "content": "# Plan\n\n- Inspect renderer\n- Add tests\n- Verify output"
}
```

JSON:

```json
{
  "version": 1,
  "format": "json",
  "title": "Session Snapshot",
  "content": "{\"items\":[{\"title\":\"Plan\",\"format\":\"markdown\"}],\"lastAction\":\"show\"}"
}
```

Mermaid:

```json
{
  "version": 1,
  "format": "mermaid",
  "title": "Flow",
  "content": "graph TD\nA[Agent] --> B[visual-aid]"
}
```

## Manual MCP Server Fallback

If you need to run the MCP server manually outside Codex, point it at the same dogfood session file:

```fish
env VISUAL_AID_SESSION_PATH=(pwd)/.visual-aid/dev-session.json npx tsx mcp/server.ts
```

## Related Docs

- [docs/installation.md](/Users/max/projects/mantoni/visual-aid/docs/installation.md)
- [docs/dogfooding.md](/Users/max/projects/mantoni/visual-aid/docs/dogfooding.md)
