# Installation

## Purpose

Explain how to install `visual-aid` in its current source-first state.

## Current Install Story

Today the primary install path is from source. A GitHub Releases installer flow is planned, but it is not the default path yet.

## Prerequisites

- Install the Tauri prerequisites for your operating system: [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
- Install a recent Node.js LTS release with `npm`
- Install Rust through `rustup`

On macOS desktop-only setups, the Tauri prerequisites page documents `xcode-select --install` as the lighter-weight path when full Xcode is not needed.

## Install From Source

```sh
git clone <repo-url>
cd visual-aid
npm install
```

## Verify The Checkout

Run the smallest checks that confirm the install is healthy:

```sh
npm run check
npm test
```

If you only want the desktop app running locally, `npm start` is the canonical development entrypoint.

## Launch The App

```sh
npm start
```

That command:

- creates or reuses `.visual-aid/dev-session.json`
- launches the Tauri app in dev mode
- leaves MCP server startup to Codex configuration

## Build A Desktop Bundle From Source

If you want a local packaged build instead of dev mode:

```sh
npm run tauri:build
```

Tauri will place the resulting bundles under `src-tauri/target/`.

## Related Docs

- [docs/dogfooding.md](dogfooding.md)
- [docs/usage.md](usage.md)
