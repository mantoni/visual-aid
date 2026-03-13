# 0001: Markdown-First Agent Workflow

## Status

Accepted

## Context

This project is intended to be built and maintained primarily by a coding agent across multiple sessions. Without a disciplined written record, project intent and prior decisions can become fragmented or lost between sessions.

The repository therefore needs a lightweight but reliable documentation structure that the agent can treat as the primary source of project memory.

## Decision

The project will use markdown files as its primary decision and context layer.

Specifically:

- significant decisions must be recorded in markdown
- product, architecture, and workflow guidance must live in repository documents
- implementation should follow the documented direction or update it in the same change
- decision history should be preserved through numbered markdown decision records

## Consequences

Positive consequences:

- future agent sessions can recover context quickly
- major choices become reviewable in git
- project direction is easier to inspect before code exists

Costs and constraints:

- documentation updates become part of normal implementation work
- overlapping documents must be kept under control
- discipline is required to prevent code from drifting away from the written record
