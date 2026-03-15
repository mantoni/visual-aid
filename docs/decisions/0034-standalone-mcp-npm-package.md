# 0034: Standalone MCP Npm Package

## Status

Accepted

## Context

Visual AId already has a packaged desktop-app distribution path through GitHub Releases, but the MCP server still assumes a source checkout with `tsx`, repository-local paths, and the full app repository installed.

That is heavier than necessary for the MCP side of the product. The install story should let users fetch only the MCP server bits they need, while contributors keep the existing source-checkout dogfood workflow.

## Decision

The MCP server will live in a separate publishable npm package at `packages/visual-aid/`, and that package will use the npm package name `visual-aid`.

Specifically:

- `packages/visual-aid/` contains the publishable MCP server source and package metadata
- the standalone package exposes a `visual-aid` binary for stdio MCP usage
- the standalone package publishes only its built server artifacts and package README, not the whole desktop-app repository
- the repository root keeps lightweight `mcp/` wrappers so the existing source-checkout dogfood workflow and tests continue to use stable local paths
- repository version sync keeps the standalone MCP package version aligned with the root package and desktop release metadata

## Consequences

Positive consequences:

- npm-based MCP installation can become much simpler than cloning the whole repository
- the packaged MCP server has a clear ownership boundary separate from the Tauri renderer code
- local dogfooding stays compatible with the existing `npm start` and `tsx mcp/server.ts` workflow

Costs and constraints:

- versioning now has to stay aligned across one more package manifest
- the publishable MCP package cannot assume the whole source tree is present at runtime
- installed-app discovery and npm publishing automation still need to be handled explicitly in later work
