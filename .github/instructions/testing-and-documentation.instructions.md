---
description: 'Use when changing tests, Markdown, CI, or developer tooling. Covers behavior-first validation, documentation ownership, execution plans, and deterministic quality gates.'
applyTo: '__tests__/**/*,backend/tests/**/*,docs/**/*.md,README.md,AGENTS.md,.github/**/*.md,.github/**/*.yml,.github/**/*.yaml,scripts/**/*'
---

# Testing and Documentation Rules

- Test externally observable behavior and important failure paths, not implementation details.
  Use the closest existing test pattern and run the narrowest relevant command before broader
  suites.
- Keep documentation factual, concise, and linked to its owning code or operator workflow. Update
  it only when the developer, operational, public, or architectural contract changes.
- Multi-session or multi-PR work belongs in `docs/plans/active/`; record acceptance checks,
  decisions, validation, blockers, and the exact next step. Move completed plans without erasing
  their decision trail.
- CI should enforce deterministic facts such as types, lint, tests, file structure, frontmatter,
  and links. Do not encode subjective architecture opinions as brittle automation.
