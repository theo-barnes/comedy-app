# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Agent Workflow

`AGENTS.md` is the entry point, not the complete handbook. Read the relevant source of truth
before changing a boundary:

- [Engineering playbook](docs/engineering-playbook.md) for architecture, risk, reuse, testing,
  and documentation decisions.
- [Agent workflow](docs/agent-workflow.md) for task lifecycle and validation commands.
- [Backend architecture](docs/backend-architecture.md) for Python module layering and ports.
- `.github/instructions/*.instructions.md` for path-specific rules. Read the instruction that
  matches every file you change.

Before editing, identify the owning feature/domain, its callers, its data/API/schema boundary,
and the smallest focused check that could disprove the intended behavior. Keep routes thin,
preserve feature/domain ownership, and prefer existing patterns over new abstractions.

Classify risk before implementation:

- Low: local implementation or documentation change with no public contract, security, schema,
  or cross-domain impact. Run focused validation.
- Medium: multiple modules, a reusable abstraction, user-visible behavior, or a changed API
  consumer. Record the design, reuse, test, and documentation decisions in the pull request.
- High: public API/schema/auth/RLS/payment/media/security boundary, destructive migration, or
  durable architectural dependency. Create an ADR or execution plan before implementation and
  document rollout, rollback, and end-to-end verification.

Work incrementally. Do not mix unrelated refactors with product work. After every substantive
edit, run the narrowest relevant validation before widening scope. UI, media, auth, and
integration changes also need a proportionate user-journey check on a simulator, device, or
automation when the environment makes that possible.

## Git Delivery

For every code or documentation change, work on a fresh, appropriately named branch based on
the current `origin/main` (for example, `fix/<concise-problem>` or `feat/<concise-feature>`).
Before creating the branch, preserve and do not revert unrelated user changes. Run focused
validation, commit with a Conventional Commit title and a descriptive body when the why is not
obvious, then prepare a completed pull-request description from
`.github/pull_request_template.md` before pushing the branch to `origin`. Paste that completed
description into the pull request without its placeholder comments. Report the branch, commit SHA,
validation performed, completed description, and a compare URL ready to create a pull request. Do
not merge or delete branches unless the user explicitly asks.

For multi-session or multi-PR work, maintain a plan in `docs/plans/active/` and move it to
`docs/plans/completed/` when finished. At delivery, report affected boundaries, validation,
documentation/ADR impact, remaining risks, branch, commit, and compare URL.
