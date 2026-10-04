---
description: 'Use when changing FastAPI backend modules or backend tests. Covers modular-monolith layers, ports, factories, auth, rate limits, migrations, and fake-based tests.'
applyTo: 'backend/**/*.py'
---

# Backend Engineering Rules

- Follow the domain structure in `docs/backend-architecture.md`: domain models, ORM, repository
  Protocol and implementation, service, wire schemas, thin controller, and factory wiring.
- A domain service must not import another domain's concrete service or repository for business
  logic. Define the smallest `*Lookup` Protocol at the consuming boundary and wire its adapter in
  the consuming factory.
- Keep Pydantic API schemas camelCase, validate authorization at the controller boundary, and use
  `shared/ratelimit.py` for write limits. Preserve graceful no-DB/no-provider fallbacks where the
  existing domain supports them.
- For new tables, update the Alembic allowlist and imports as documented. Prefer explicit ORM
  insert values over relying on database defaults. Treat migrations, auth, RLS, and data deletion
  as high-risk work.
- Test services, repositories, and helpers with hand-written fakes in `backend/tests/`; do not add
  FastAPI `TestClient` or HTTP integration tests to this suite.
