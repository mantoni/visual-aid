# Backlog

## Purpose

Capture the currently intended product backlog in one place so future agent sessions can distinguish accepted direction from open questions.

## Now

- Strengthen agent-facing guidance so agents routinely use Visual AId when a richer surface helps the user inspect structured output.
- Add a top-level switcher for JSON payloads so users can toggle between the rich interactive view and plain JSON.

## Next

- Tighten the diff renderer layout so unified diffs read less spaciously.
- Add dark-mode-aware styling to rendered Mermaid diagrams.
- Support renaming and reordering workspace tabs without adding multi-window support.
- Define a separate full-document HTML format for interactive web feature or site previews instead of broadening fragment-oriented `html`.
- Continue Milestone 3 usability work on layout, payload handling, and everyday workflow polish.

## Later

- Revisit other renderers after Markdown, based on which formats still feel too weak in daily use.
- Consider a separate non-Codex helper command that launches both the app and the MCP server for manual workflows if that need becomes concrete.

## Decided Direction

- Additional formats belong in the product codebase. The project is not pursuing a plugin model for format support.
- Multi-session browsing should stay inside a single app window rather than adding multi-window support.
