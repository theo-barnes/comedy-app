-- ─────────────────────────────────────────────────────────────────────────────
-- Fix schema drift: profiles was created via a CLI-applied migration, which
-- does not inherit the Dashboard SQL editor's default ACLs for anon/
-- authenticated/service_role. RLS policies exist but table-level GRANTs were
-- never issued, so every authenticated client request hit Postgres's own
-- "permission denied for table profiles" (42501) before RLS was even
-- evaluated — silently blocking the in-app role-selection update.
-- ─────────────────────────────────────────────────────────────────────────────

grant select, update on public.profiles to authenticated;
