# Dogfooding

## Canonical Flow

The default local dogfood path is:

1. Run `npm start`.
2. Point Codex `config.toml` at this checkout's generic MCP server config.
3. Use the MCP tools from any project.

`npm start` creates or reuses `.visual-aid/dev-session.json`, starts `tauri:dev` with `VISUAL_AID_SESSION_PATH` set, and stays focused on the app process only. Codex should continue to own MCP server startup from `config.toml`.

## Cross-Workspace Testing

The printed MCP config is now generic. It points at this checkout's server entrypoint by absolute path, but it does not pin `cwd` or `VISUAL_AID_SESSION_PATH`. That means Codex can reuse the same config across projects, and each caller project gets its own `.visual-aid/session.json` automatically.

The generic config now relies on the launcher to start the MCP server with the correct process cwd for the active project.

If a launcher needs to target a different workspace than its process cwd, set `VISUAL_AID_WORKSPACE_CWD` explicitly for that run.

Debug-binary auto-launch is only valid while the Tauri dev server is live. If you are not running `npm start` or `npm run tauri:dev`, `visual-aid` will fall back to packaged artifacts instead of launching the debug binary by itself.

## Codex MCP Config

To print the exact block for the current checkout, run:

```sh
npm start -- --print-codex-config
```

Expected shape:

```toml
[mcp_servers.visual-aid]
command = "/absolute/path/to/node"
args = ["/absolute/path/to/visual-aid/node_modules/tsx/dist/cli.mjs", "/absolute/path/to/visual-aid/mcp/server.ts"]
env = { VISUAL_AID_PREFER_DEBUG_APP = "1" }
```

## Fish Fallback

If you need to run the MCP server manually outside Codex, use:

```fish
env VISUAL_AID_SESSION_PATH=(pwd)/.visual-aid/dev-session.json npx tsx mcp/server.ts
```

## Quick Test Sequence

1. Call `visual-aid.status` from any project and confirm the reported `sessionPath` ends with that project's `.visual-aid/session.json`.
2. Call `visual-aid.open` and confirm the app window opens or focuses.
3. Call `visual-aid.show` with a small markdown payload and confirm it renders in the app.
4. Call `visual-aid.clear` and confirm the rendered content disappears.
