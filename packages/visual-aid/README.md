# visual-aid

`visual-aid` is the publishable MCP server package for Visual AId.

It exposes the `visual-aid.status`, `visual-aid.open`, `visual-aid.show`, and `visual-aid.clear` MCP tools over stdio so an MCP client can launch the desktop app and render structured content.

Project homepage: [https://github.com/mantoni/visual-aid](https://github.com/mantoni/visual-aid)

## Install

```sh
npm install -g visual-aid
```

Or run it on demand:

```sh
npx -y visual-aid
```

## Requirements

- Visual AId desktop app installed locally, or
- a local source checkout with build artifacts discoverable by the server, or
- `VISUAL_AID_APP_PATH` / `VISUAL_AID_OPEN_COMMAND` configured explicitly

## Codex Config

```toml
[mcp_servers.visual-aid]
command = "npx"
args = ["-y", "visual-aid"]
```

## Environment

- `VISUAL_AID_SESSION_PATH`: session file override
- `VISUAL_AID_WORKSPACE_CWD`: workspace identity override
- `VISUAL_AID_REGISTRY_PATH`: shared workspace registry override
- `VISUAL_AID_OPEN_COMMAND`: explicit launch command
- `VISUAL_AID_APP_PATH`: explicit app bundle or executable path
- `VISUAL_AID_PREFER_DEBUG_APP`: prefer the local debug build when the dev server is live
- `VISUAL_AID_DEV_SERVER_URL`: override the dev-server probe URL used for debug-build detection
