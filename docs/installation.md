# Installation

## Purpose

Explain how to install Visual AId from packaged releases or from source.

## Current Install Story

Packaged installers published to GitHub Releases are now the primary install path.

Source builds remain supported for contributors and for local dogfooding.

## Install From GitHub Releases

1. Open the latest release on GitHub.
2. Download the installer or bundle for your operating system.
3. Install Visual AId using your platform's normal app-install flow.

The release automation publishes versioned releases from `v<version>` tags and can also stage draft or pre-release builds for maintainers.

## Source Build Prerequisites

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

## Maintainer Release Flow

Maintainers publish packaged installers through the repository release workflow:

1. Run `npm version patch`, `npm version minor`, or `npm version major` to bump `package.json` and sync `src-tauri/tauri.conf.json` plus `src-tauri/Cargo.toml`.
2. Push the generated release commit and tag with `git push --follow-tags` to publish the stable release automatically.
3. Or push the version commit and start the `Release` workflow manually to stage a draft or pre-release from the current checkout.

## Related Docs

- [docs/dogfooding.md](dogfooding.md)
- [docs/usage.md](usage.md)
