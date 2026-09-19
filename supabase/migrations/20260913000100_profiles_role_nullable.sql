-- ─────────────────────────────────────────────────────────────────────────────
-- Fix schema drift: the deployed profiles.role column carries a NOT NULL
-- constraint predating 20260610000100_baseline_profiles.sql. `create table if
-- not exists` never touches an existing column, so that constraint survived
-- every migration run and breaks any sign-up that doesn't supply a role
-- immediately (OAuth sign-up, or any client relying on the later "select role"
-- step) with `23502 null value in column "role" violates not-null constraint`.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles alter column role drop not null;
