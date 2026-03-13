# Specs

## Purpose

This directory stores behavior specifications for the project.

Specs are the primary behavioral contract between:

- the project documents
- the implementation
- the automated test suite

## Format

Each spec should include:

- purpose
- preconditions
- invariants
- scenarios
- test mapping

Scenarios should use short BDD-style statements with `Given`, `When`, and `Then`.

## Scenario IDs

Each acceptance scenario must have a stable identifier such as:

- `VAS-OPEN-001`
- `VAS-SHOW-002`

Automated tests should include the same scenario ID in the test name.

## Rules

- New behavior should not be considered complete until it has a documented scenario and an automated test.
- When behavior changes, update the spec and the tests in the same change.
- Specs should describe externally visible behavior, not internal implementation details.
