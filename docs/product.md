# Product

## Problem

Coding agents often need to share information that is awkward to inspect in a terminal-only interface. Diagrams, diffs, rich markdown, and structured visual artifacts lose clarity when forced into plain text output.

## Product Goal

Visual AId provides a dedicated visual surface that coding agents can launch and control. The agent sends structured content, and the app renders the content in a format that is easier for the user to inspect.

## Users

The primary workflow has two actors:

- the coding agent, which generates and sends structured data
- the end user, which consumes the rendered output through the desktop app

## Value

The project should help users understand:

- code changes
- architecture diagrams
- rich text explanations
- other structured technical artifacts that benefit from visual rendering

## Scope Direction

Initial scope should focus on:

- launching the desktop app reliably
- accepting structured payloads from an agent
- rendering a small set of high-value formats well
- making the integration simple enough that agents can use it consistently

Format growth remains product-owned. New formats should be added directly in the codebase rather than through a plugin model.

Out of scope for the earliest phase:

- collaborative editing
- cloud synchronization
- multi-user workflows
- broad document management features

## Milestone Direction

### Milestone 1

Establish the application shell and a minimal agent-to-app flow.

### Milestone 2

Support a first set of renderers for the core structured formats.

### Milestone 3

Improve usability, layout, and payload handling so the tool becomes practical in everyday agent workflows.

Current Milestone 3 priorities include:

- stronger renderer quality, starting with Markdown
- single-window multi-session browsing across working directories
- installation, usage, and release documentation that make the product easier to adopt
