# Spec 0008: Dogfooding Start Workflow

## Purpose

Define the canonical local dogfooding workflow centered on `npm start`.

Related decisions:

- [0005-documentation-integrated-testing.md](../decisions/0005-documentation-integrated-testing.md)
- [0007-npm-start-canonical-dogfood-entrypoint.md](../decisions/0007-npm-start-canonical-dogfood-entrypoint.md)

## Preconditions

- Dependencies are installed for the repository checkout.
- The working copy contains the Tauri app and MCP server.
- Codex may be configured separately to run the MCP server from `config.toml`.

## Invariants

- `npm start` without overrides creates or reuses the repository-local `.visual-aid/dev-session.json`.
- `npm start` launches `tauri:dev` with `VISUAL_AID_SESSION_PATH` set to the canonical dogfood session path.
- `npm start` does not start a competing local MCP server process.
- `npm start -- --print-codex-config` prints a generic Codex MCP config block without launching the app.

## Scenarios

### VDF-START-001 npm start creates the canonical dev session file when missing

Given no prior dogfood session file
When `npm start` runs
Then `.visual-aid/dev-session.json` is created
And it contains an empty session document

### VDF-START-002 npm start reuses the canonical dev session file without overwriting it

Given an existing `.visual-aid/dev-session.json`
When `npm start` runs
Then the existing session file is preserved
And `npm start` reuses that path for the app process

### VDF-START-003 npm start launches tauri dev with the canonical session path in the environment

Given the repository root
When `npm start` launches the app
Then it runs `tauri:dev`
And the child environment includes `VISUAL_AID_SESSION_PATH` for `.visual-aid/dev-session.json`

### VDF-START-004 npm start can print the matching Codex MCP config block without launching the app

Given the repository root
When `npm start -- --print-codex-config` runs
Then the output contains a `mcp_servers.visual-aid` block
And the block points Codex at this checkout's MCP server entrypoint
And the block does not pin Codex to a single workspace session path

### VDF-START-005 Help output includes the manual fish fallback command

Given the repository root
When `npm start -- --help` runs
Then the output describes the dogfood workflow
And it includes the fish command for manually running `npx tsx mcp/server.ts` against `.visual-aid/dev-session.json`

## Test Mapping

- `tests/scripts/start.test.ts`: `VDF-START-001`, `VDF-START-002`, `VDF-START-003`, `VDF-START-004`, `VDF-START-005`
