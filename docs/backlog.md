# Backlog

## Purpose

Capture the currently intended product backlog in one place so future agent sessions can distinguish accepted direction from open questions.

## Now

- Improve Markdown rendering beyond the current lightweight renderer. This is the first renderer-quality priority.
- Write installation and usage documentation for end users and agents.
- Define and document a release process that builds installers and uploads them to GitHub Releases.
- Strengthen agent-facing guidance so agents routinely use `visual-aid` when a richer surface helps the user inspect structured output.

## Next

- Add single-window multi-session browsing with tabs at the top of the app, keyed by working directory.
- Support closing, renaming, and reordering workspace tabs without adding multi-window support.
- Define a separate full-document HTML format for interactive web feature or site previews instead of broadening fragment-oriented `html`.
- Continue Milestone 3 usability work on layout, payload handling, and everyday workflow polish.

## Later

- Revisit other renderers after Markdown, based on which formats still feel too weak in daily use.
- Consider a separate non-Codex helper command that launches both the app and the MCP server for manual workflows if that need becomes concrete.

## Decided Direction

- Additional formats belong in the product codebase. The project is not pursuing a plugin model for format support.
- Multi-session browsing should stay inside a single app window rather than adding multi-window support.
