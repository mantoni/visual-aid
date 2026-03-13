# Dogfooding

## Canonical Flow

The default local dogfood path is:

1. Run `npm start`.
2. Point Codex `config.toml` at the same `.visual-aid/dev-session.json`.
3. Use the MCP tools against that shared session path.

`npm start` creates or reuses `.visual-aid/dev-session.json`, starts `tauri:dev` with `VISUAL_AID_SESSION_PATH` set, and stays focused on the app process only. Codex should continue to own MCP server startup from `config.toml`.

## Codex MCP Config

To print the exact block for the current checkout, run:

```sh
npm start -- --print-codex-config
```

Expected shape:

```toml
[mcp_servers.visual-aid]
command = "npx"
args = ["tsx", "mcp/server.ts"]
cwd = "/absolute/path/to/visual-aid"
env = { VISUAL_AID_SESSION_PATH = "/absolute/path/to/visual-aid/.visual-aid/dev-session.json" }
```

## Fish Fallback

If you need to run the MCP server manually outside Codex, use:

```fish
env VISUAL_AID_SESSION_PATH=(pwd)/.visual-aid/dev-session.json npx tsx mcp/server.ts
```

## Quick Test Sequence

1. Call `visual-aid.status` and confirm the reported `sessionPath` ends with `.visual-aid/dev-session.json`.
2. Call `visual-aid.open` and confirm the app window opens or focuses.
3. Call `visual-aid.show` with a small markdown payload and confirm it renders in the app.
4. Call `visual-aid.clear` and confirm the rendered content disappears.
