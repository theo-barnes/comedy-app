# Agent Workflow

Use this as the operational index for [AGENTS.md](../AGENTS.md) and the
[engineering playbook](engineering-playbook.md).

## Lifecycle

1. Read the root workflow and the instruction files matching the intended edits.
2. Find the owning feature/domain, nearest test, and public/data boundary.
   For user-visible work, read the [UI view register](ui-view-register.md), identify the affected
   view IDs and existing design guidance, and register any proposed new views before implementing.
3. Classify risk and state the smallest check that could disprove the intended behavior.
4. Make one focused change, run that check, then continue only when it passes or has a diagnosed
   failure.
5. Run the proportional suite and document the validation, documentation impact, and residual
   risk in the pull request.
   Update affected UI-register entries in the same change, distinguishing automated checks,
   user reports, device evidence and design approval. Record operator prerequisites in
   the versioned feature plan and [Operator Tasks](OPERATOR-TASKS.md), the Git-ignored local
   runbook; do not mark unprovisioned resources as complete.

Use `docs/plans/active/` when work spans sessions or pull requests. Include scope, acceptance
checks, status, decisions, validation, blockers, and the exact next action. Move the file to
`docs/plans/completed/` when it is finished.

## Validation Matrix

| Change                     | Minimum validation                                                |
| -------------------------- | ----------------------------------------------------------------- |
| Component/hook/screen      | Targeted Jest test and affected lint/typecheck                    |
| API client/schema          | Client/schema tests plus producer/consumer contract checks        |
| Backend service/repository | Targeted pytest using fakes                                       |
| Migration/auth/RLS         | Contract and authorization tests, plus rollout/rollback reasoning |
| UI/media/auth journey      | Unit tests plus simulator/device/automation path when available   |
| Instructions/CI/docs       | `pnpm validate:governance` and affected command/document checks   |

## Sources of Truth

- [Engineering playbook](engineering-playbook.md)
- [Backend architecture](backend-architecture.md)
- [UI view register](ui-view-register.md)
- [Operator tasks](OPERATOR-TASKS.md)
- [Next steps](NEXT-STEPS.md)
- [Root README](../README.md)
