# Visual AId

Visual AId is a local desktop app for coding agents that need a better surface than plain terminal text.

An agent can launch the app over MCP, send a structured payload, and let the desktop UI render it in a form the user can actually inspect. The project is built around everyday agent workflows such as plans, code snippets, diffs, diagrams, JSON payloads, and lightweight HTML previews.

## What It Does

Visual AId gives agents a dedicated visual output window instead of forcing every artifact through a terminal transcript.

The current flow is:

1. An MCP client calls `visual-aid.open` or `visual-aid.show`.
2. The MCP server writes workspace-scoped session state.
3. The Tauri desktop app renders the latest payload for that workspace.

## Features

- MCP tool surface for `visual-aid.status`, `visual-aid.open`, `visual-aid.show`, and `visual-aid.clear`
- Desktop rendering for `markdown`, `code`, `json`, `diff`, `mermaid`, and `html`
- Rich Markdown support including tables, fenced code blocks, embedded Mermaid, and embedded diffs
- Single-window multi-workspace tabs keyed by working directory
- Session persistence and last-known-good restore behavior
- Self-describing MCP metadata and readable MCP usage resources
- Source-checkout dogfood flow for local development
- Standalone MCP package source under [`packages/visual-aid`](packages/visual-aid)

## Supported Payloads

Visual AId currently renders:

- Markdown
- Source code
- JSON
- Unified diff
- Mermaid
- HTML fragments and wireframes

## Setup

There are two distinct ways to use this project:

- regular use: install the desktop app and point your MCP client at the standalone `visual-aid` server package
- contributor use: run the app and MCP server directly from this repository checkout

### Regular Setup

For most users, the intended setup is:

1. Install the desktop app from this repository’s GitHub Releases.
2. Configure your MCP client to use the standalone `visual-aid` MCP server.

Desktop app install:

1. Open the latest release for this repository.
2. Download the installer or app bundle for your platform.
3. Install it using your platform’s normal flow.

Simpler MCP setup:

```toml
[mcp_servers.visual-aid]
command = "npx"
args = ["-y", "visual-aid"]
```

Or, if the package is installed globally:

```toml
[mcp_servers.visual-aid]
command = "visual-aid"
```

That is the simpler MCP setup this project is aiming for: no source checkout, no `tsx` path, and no repo-local wiring in the MCP config.

The repository already contains that standalone package source under [`packages/visual-aid`](packages/visual-aid). If npm publication is not available yet in your environment, use the contributor setup below.

### Contributor Setup

If you are developing Visual AId itself or dogfooding from a source checkout:

```sh
git clone https://github.com/mantoni/visual-aid.git
cd visual-aid
npm install
npm start
```

Then print the matching MCP config for that checkout:

```sh
npm start -- --print-codex-config
```

Expected shape:

```toml
[mcp_servers.visual-aid]
command = "/absolute/path/to/visual-aid/node_modules/.bin/tsx"
args = ["/absolute/path/to/visual-aid/mcp/server.ts"]
env = { VISUAL_AID_PREFER_DEBUG_APP = "1" }
```

That source-checkout config is the contributor dogfood path. It is not the simplest end-user setup.

## Quick Start

For regular use:

1. Install the desktop app from GitHub Releases.
2. Configure your MCP client to run `visual-aid`.
3. Call `visual-aid.status`.
4. Call `visual-aid.open`.
5. Call `visual-aid.show` with a payload.

For contributor use from this repository:

1. Install dependencies with `npm install`.
2. Start the desktop app with `npm start`.
3. Print the matching Codex MCP config with `npm start -- --print-codex-config`.
4. Add that block to your Codex `config.toml`.
5. Call `visual-aid.status`, then `visual-aid.open`, then `visual-aid.show`.

## Codex Setup

Use one of these two patterns:

- simpler MCP package setup:

```toml
[mcp_servers.visual-aid]
command = "npx"
args = ["-y", "visual-aid"]
```

- source-checkout dogfood setup:

```sh
npm start -- --print-codex-config
```

The source-checkout config is generic:

- it points at this checkout’s MCP server entrypoint
- it does not pin a single workspace
- the active caller project gets its own `.visual-aid/session.json`

If you need to run the source-checkout MCP server manually outside Codex, use:

```fish
env VISUAL_AID_SESSION_PATH=(pwd)/.visual-aid/dev-session.json npx tsx mcp/server.ts
```

## Using Visual AId

Once the app and MCP server are available, the normal tool flow is:

1. `visual-aid.status` to inspect workspace and session diagnostics
2. `visual-aid.open` to launch or focus the desktop app
3. `visual-aid.show` to render a payload
4. `visual-aid.clear` to clear the current workspace output

Example payload:

```json
{
  "version": 1,
  "format": "markdown",
  "title": "Plan",
  "summary": "Current implementation plan",
  "content": "# Plan\n\n- Inspect renderer\n- Add tests\n- Verify output"
}
```

## Development

This section is for contributors working from the repository checkout.

Useful commands:

- `npm start`: canonical local dogfood entrypoint
- `npm start -- --print-codex-config`: print the current checkout’s MCP config
- `npm run check`: TypeScript type-check
- `npm test`: run Vitest
- `npm run build`: build the frontend bundle
- `npm run build:mcp-package`: build the standalone MCP package
- `npm run tauri:build`: build desktop bundles
- `npm run verify`: run check, test, frontend build, and MCP package build

Important environment variables:

- `VISUAL_AID_SESSION_PATH`: override the session file path
- `VISUAL_AID_WORKSPACE_CWD`: override the workspace identity
- `VISUAL_AID_REGISTRY_PATH`: override the shared workspace registry path
- `VISUAL_AID_OPEN_COMMAND`: explicit launch command for `visual-aid.open`
- `VISUAL_AID_APP_PATH`: explicit app bundle or executable path
- `VISUAL_AID_PREFER_DEBUG_APP`: prefer a local debug build when dev mode is live
- `VISUAL_AID_DEV_SERVER_URL`: override the dev-server probe URL used for debug detection

## Repository Layout

- [`src/`](src): Vite renderer UI
- [`src-tauri/`](src-tauri): Tauri host application
- [`packages/visual-aid/`](packages/visual-aid): standalone MCP package source
- [`mcp/`](mcp): compatibility wrappers for the repo-local MCP entrypoints
- [`tests/`](tests): Vitest coverage
- [`docs/`](docs): product, architecture, specs, and decision records

## Documentation

Start here for deeper detail:

- [`docs/installation.md`](docs/installation.md): installation paths and prerequisites
- [`docs/usage.md`](docs/usage.md): payloads, tools, and normal usage
- [`docs/dogfooding.md`](docs/dogfooding.md): canonical local workflow
- [`docs/product.md`](docs/product.md): product intent and scope
- [`docs/architecture.md`](docs/architecture.md): system shape and technical boundaries
- [`docs/specs/README.md`](docs/specs/README.md): behavior specs
- [`docs/decisions/README.md`](docs/decisions/README.md): architectural decision records

## Status

Visual AId is actively evolving. The core MCP-to-desktop flow is working, the renderer set is already useful, and current work is focused on making installation, renderer quality, and everyday agent workflows easier to adopt.
