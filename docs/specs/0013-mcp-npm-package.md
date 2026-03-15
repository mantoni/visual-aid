# Spec 0013: MCP Npm Package

## Purpose

Define the repository-owned packaging contract for the standalone npm package that distributes the Visual AId MCP server.

Related decisions:

- [0017-github-release-distribution.md](../decisions/0017-github-release-distribution.md)
- [0034-standalone-mcp-npm-package.md](../decisions/0034-standalone-mcp-npm-package.md)

## Preconditions

- The repository contains the desktop app and the MCP server source.
- The standalone MCP package is kept under `packages/visual-aid/`.

## Invariants

- The standalone MCP package uses the npm package name `visual-aid`.
- The standalone MCP package exposes a `visual-aid` executable for stdio MCP usage.
- The standalone MCP package publishes only the built server artifacts and its package README.
- Repository version sync keeps the standalone MCP package version aligned with the root package and desktop release metadata.

## Scenarios

### VMP-PACK-001 Standalone MCP package uses the visual-aid npm identity

Given the repository package metadata
When the standalone MCP package metadata is inspected
Then its package name is `visual-aid`
And it exposes a `visual-aid` binary entrypoint

### VMP-PACK-002 Standalone MCP package publishes only the built MCP payload

Given the repository package metadata
When the standalone MCP package metadata is inspected
Then its published file list contains the built output and package README
And it does not publish the desktop app source tree

### VMP-VERSION-001 Repository version sync updates the standalone MCP package version

Given a repository version bump
When the version sync script runs
Then `packages/visual-aid/package.json` is updated to the same version
And the reported updated-file list includes `packages/visual-aid/package.json`

## Test Mapping

- `tests/scripts/package.test.ts`: `VMP-PACK-001`, `VMP-PACK-002`
- `tests/scripts/release.test.ts`: `VMP-VERSION-001`
