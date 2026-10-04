# Engineering Playbook

## Purpose

This playbook is the durable engineering source of truth for people and coding agents. It makes
the repository legible without turning `AGENTS.md` into an encyclopaedia. Update this document
when an architectural rule changes; update local instructions only when a rule must be injected
for a particular path.

## Research Basis

This workflow adapts first-party agent-engineering guidance to this repository:

- [OpenAI harness engineering](https://openai.com/index/harness-engineering/) supports a short
  agent entry point, versioned repository knowledge, progressive disclosure, mechanically enforced
  invariants, and feedback-driven harness improvement.
- [Anthropic long-running agent harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
  support incremental work, clean handoffs, durable execution records, and explicit end-to-end
  verification.
- [GitHub Copilot custom instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)
  support repository-wide instructions together with path-specific instruction files and nearby
  `AGENTS.md` guidance.

These sources inform the control system, not the implementation details. Repository conventions
and validated behavior always take precedence.

## System Map

The mobile app is Expo SDK 56, TypeScript, Expo Router, React Native, React Query, Zod, Supabase,
and Sentry. Routes in `app/` wire navigation; feature modules in `src/features/` own screens,
view models, and domain-specific composition. Shared UI is in `src/components/`; cross-cutting
client concerns are in `src/lib/`, `src/providers/`, and `src/theme/`.

The backend is a FastAPI modular monolith under `backend/src/`. Each domain follows:

```
domain models -> ORM/repository -> service -> schemas -> controller -> factory
```

Services depend on narrow `Protocol` ports rather than other domains' concrete implementations.
See [backend architecture](backend-architecture.md) for the module map and allowed cross-domain
dependencies. Supabase migrations own auth/RLS concerns; Alembic owns backend platform tables.

## Boundary Rules

- Keep Expo routes thin and put behavior in the owning feature.
- Parse external API responses with Zod at `src/lib/api/`; use React Query hooks and hierarchical
  query keys for server state.
- Keep backend controllers as HTTP adapters and services as business logic. Add cross-domain
  dependencies through small `*Lookup` ports and factory wiring.
- Preserve explicit fallbacks for unavailable storage/providers where a domain already defines
  them. Do not hide a new failure mode behind fixture data.
- Treat API schemas, database/RLS changes, authentication, authorization, media lifecycle, and
  rate limiting as explicit contracts.

## Reuse and Abstractions

Prefer an existing local pattern over a new helper. Keep logic local when it has one caller, its
meaning is specific to one feature, or extracting it would require a vague configuration API.

Create an abstraction when one of these is true:

- The same behavior has two independent, stable callers.
- It captures a named domain concept, invariant, or boundary.
- It prevents divergent security, validation, caching, or lifecycle behavior.
- It replaces a dependency direction violation with a narrow port.

An abstraction must have a clear owner, focused public API, direct tests, and no speculative
options. Prefer a small local duplication to a premature generic framework.

## Risk and Design Records

| Risk   | Examples                                                                           | Required evidence                                                                               |
| ------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Low    | Local UI copy, isolated component logic, test/doc correction                       | Focused test, lint, or typecheck as appropriate                                                 |
| Medium | Reusable component, multi-module behavior, changed API consumer                    | PR design/reuse/test/docs decisions and focused tests                                           |
| High   | API/schema/auth/RLS boundary, migration, destructive operation, durable dependency | ADR or execution plan, rollout/rollback, contract tests, end-to-end validation where applicable |

Create an ADR in `docs/decisions/` for high-risk decisions with lasting consequences. Record
context, decision, alternatives, consequences, migration/rollback, and verification. Use an
execution plan in `docs/plans/active/` for work spanning sessions or pull requests; move it to
`docs/plans/completed/` when complete.

## Testing and Validation

Run the smallest check that can falsify the change immediately after a substantive edit, then run
the relevant broader checks. Standard commands:

```sh
pnpm typecheck
pnpm lint
pnpm test:ci
cd backend && DISCOVERY_DATABASE_URL='' DISCOVERY_REDIS_URL='' .venv/bin/python -m pytest tests/ -q
```

Use React Native Testing Library for frontend behavior. Backend tests exercise services,
repositories, and helpers with fakes. UI, media, auth, and integration work also needs a
proportionate simulator/device or automation journey check when available. Record what could not
be exercised and why.

## Documentation and Feedback

Documentation is codebase knowledge, not release narration. Update the owning architecture,
operator, API, or workflow document when behavior changes. Keep generated or temporary evidence
out of enduring docs.

Treat recurring agent or review failures as a signal that the harness is incomplete. After a few
changes, promote the most valuable repeated feedback into a test, structural check, concise
instruction, or this playbook. Do not solve drift by continuously enlarging `AGENTS.md`.
