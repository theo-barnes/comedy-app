---
description: 'Use when changing API schemas, API clients, shared types, Supabase migrations, Alembic migrations, authentication, or RLS. Covers compatible contract evolution and rollout safety.'
applyTo: 'src/lib/api/**/*.ts,src/lib/api/**/*.tsx,src/types/**/*.ts,backend/**/schemas.py,backend/alembic/**/*.py,supabase/migrations/**/*.sql'
---

# Contract and Data Rules

- Trace producer, consumer, validation schema, persistence, authorization, and error behavior
  before changing a contract. Update both sides of a mobile/backend contract in one change or
  document a compatible staged rollout.
- Validate untrusted data at the boundary: Zod for frontend responses and Pydantic for backend
  request/response models. Avoid `any`, unchecked casts, or assumed provider payloads.
- Treat public API shape, authentication, roles, RLS/grants, migrations, and destructive data
  changes as high risk. Document compatibility, rollout, rollback, data backfill, and verification
  in an ADR or execution plan when the change is durable or cannot be trivially reversed.
- Add focused tests for accepted values, rejected values, authorization, and error translation.
