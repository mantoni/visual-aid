# Agent Workflow

## Purpose

This repository is designed to be built and maintained primarily by a coding agent. The workflow must therefore optimize for:

- explicit written context
- low ambiguity
- durable project memory
- simple handoff between work sessions

## Working Rules

1. Read the relevant markdown documents before making substantial changes.
2. Capture new decisions in markdown as part of the same change that introduces them.
3. Prefer updating existing documents over creating overlapping sources of truth.
4. Keep implementation aligned with documented direction, or update the documentation first.
5. Record assumptions when the user has not yet made a decision.
6. For new behavior, add or update a behavior spec and automated tests in the same change.

## Required Documents

The following documents form the minimum operating framework for the project:

- [README.md](../README.md): project summary and document map
- [docs/product.md](product.md): what the project is for and what it should become
- [docs/architecture.md](architecture.md): technical structure, boundaries, and integration model
- [docs/specs/README.md](specs/README.md): behavior spec format and test linkage
- [docs/decisions/README.md](decisions/README.md): how decisions are recorded
- [docs/decisions/*.md](decisions/README.md): individual decision records

## Decision Policy

Create or update a decision record when work changes:

- architecture
- user-facing product behavior
- supported content formats
- MCP integration shape
- storage model
- rendering model
- development workflow

Minor refactors that do not change project direction do not need a new decision record, but they should still keep the existing documents accurate.

## Session Workflow

For substantial work, the agent should usually:

1. Read the project summary and any relevant decision records.
2. Update markdown documents if the task introduces or changes a decision.
3. Add or update the relevant behavior spec and acceptance scenarios.
4. Implement the code.
5. Verify behavior with automated tests.
6. Leave the repository in a state where the next agent session can recover context quickly from markdown alone.

## Writing Style

- Prefer short sections with direct language.
- Separate facts, decisions, and open questions clearly.
- Avoid vague placeholders when a concrete statement is possible.
- Use markdown links between related documents.
