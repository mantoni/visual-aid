# Spec 0011: GitHub Release Distribution

## Purpose

Define the first supported release process for building desktop installers and publishing them through GitHub Releases.

Related decisions:

- [0005-documentation-integrated-testing.md](../decisions/0005-documentation-integrated-testing.md)
- [0017-github-release-distribution.md](../decisions/0017-github-release-distribution.md)

## Preconditions

- The repository version is aligned across `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
- GitHub Actions can run on the repository.
- The release workflow has permission to create or update GitHub Releases.

## Invariants

- Release automation builds desktop bundles from the repository source with `npm ci` and `npm run tauri:build`.
- Release automation publishes the bundles to a GitHub Release whose tag matches the requested app version.
- Manual release runs can stage a draft or pre-release without requiring a second workflow definition.
- The published release process remains source-of-truth documentation for how packaged installers are produced.

## Scenarios

### VRD-BUILD-001 Release automation plans versioned artifacts for each supported platform

Given a release version such as `0.1.0`
When the release automation prepares distribution metadata
Then it expects a Git tag named `v0.1.0`
And it plans bundled artifacts for macOS, Linux, and Windows

### VRD-PUBLISH-001 Tagged releases publish installers to GitHub Releases

Given a pushed Git tag that matches `v*`
When the release automation runs
Then it builds desktop installers from that tagged revision
And it attaches the generated assets to the matching GitHub Release

### VRD-PUBLISH-002 Manual release runs can stage a draft or pre-release

Given a maintainer manually starts the release automation
When they choose draft or pre-release mode
Then the workflow still builds installers for all supported platforms
And the resulting GitHub Release stays non-public until the maintainer promotes it

## Test Mapping

- `tests/scripts/release.test.ts`: `VRD-BUILD-001`, `VRD-PUBLISH-001`, `VRD-PUBLISH-002`
