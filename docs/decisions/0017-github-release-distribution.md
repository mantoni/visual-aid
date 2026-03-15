# 0017: GitHub Release Distribution

## Status

Accepted

## Context

The project has a working source-first installation path and a local packaging command through `npm run tauri:build`, but it has no documented or automated path for producing installers that users can download directly.

That blocks adoption beyond contributors who are already prepared to clone the repository, install the Tauri prerequisites, and build from source. It also leaves release packaging as tribal knowledge instead of a repeatable repository-owned workflow.

## Decision

The first packaged distribution path will use GitHub Actions to build desktop installers and publish them to GitHub Releases.

Specifically:

- maintainers use `npm version` to bump the release version so the npm lifecycle can keep JavaScript, Rust, and Tauri version metadata aligned
- the same version sync also keeps `packages/visual-aid/package.json` aligned with the root package version
- versioned release tags use the `v<version>` format
- a single release workflow supports both pushed version tags and manual `workflow_dispatch`
- release builds run on macOS, Linux, and Windows runners
- each build installs Node and Rust, runs `npm ci`, and runs `npm run tauri:build`
- the workflow uploads bundled artifacts and publishes them on the matching GitHub Release
- manual runs can mark the resulting release as a draft or pre-release

## Consequences

Positive consequences:

- users get a documented installer-based adoption path that does not require building from source
- release packaging becomes repeatable and reviewable inside the repository
- future release notes and upgrade workflows can anchor on GitHub Releases as the shared artifact index

Costs and constraints:

- release success now depends on cross-platform CI stability and GitHub-hosted runner behavior
- signed and notarized distribution may still require later repository or organization secrets
- the `npm version` lifecycle and release workflow must keep version metadata aligned across the root package, the standalone MCP package, Rust, and Tauri config files
