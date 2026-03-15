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
2. Point Codex at this checkout's generic MCP server config with `npm start -- --print-codex-config`.
3. Use the MCP tools to open, render, inspect, and clear payloads.

The printed Codex config block is generic. It points at this checkout's server code, but it leaves the caller workspace free so the active project gets its own `.visual-aid/session.json` automatically.

If the MCP launcher reports `/` as its process cwd, `visual-aid` falls back to `PWD` or `INIT_CWD` so the active shell workspace still becomes the session target.

If you are using a packaged app instead of a source checkout, point `VISUAL_AID_APP_PATH` at the installed app bundle or executable when you want `visual-aid.open` to launch that packaged build explicitly.

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

When multiple working directories send payloads through the shared registry, the app keeps them in one window and shows each working directory as a top-level tab.

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

Use the same printed config from any project. No per-project MCP changes are required.

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

For advanced manual cross-workspace testing, you can still override the workspace explicitly and prefer the debug build from this checkout:

```sh
env VISUAL_AID_SESSION_PATH=/absolute/path/to/other-project/.visual-aid/session.json VISUAL_AID_WORKSPACE_CWD=/absolute/path/to/other-project VISUAL_AID_PREFER_DEBUG_APP=1 npx tsx mcp/server.ts
```

## Related Docs

- [docs/installation.md](installation.md)
- [docs/dogfooding.md](dogfooding.md)
