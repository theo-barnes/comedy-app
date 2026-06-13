-- ─────────────────────────────────────────────────────────────────────────────
-- Security hardening: immutable role + updated_at maintenance
--
-- Closes the role-escalation vector: previously the UPDATE policy let an
-- authenticated user change their own `role` (fan → comedian/venue) with a
-- direct PostgREST update. The role may be set once (null → value, needed for
-- the social sign-up flow where the user picks a role after the row exists)
-- and is immutable afterwards.
--
-- Note: the WITH CHECK subquery approach from the original patch draft would
-- re-read the row being updated and also blocks the legitimate null → role
-- transition; a BEFORE UPDATE trigger comparing OLD/NEW is both correct and
-- cheaper, so enforcement lives there. The UPDATE policy stays scoped to the
-- owner.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Owner-scoped UPDATE policy ───────────────────────────────────────────────
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── Role immutability (set-once) ─────────────────────────────────────────────
create or replace function public.enforce_role_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role is not null and new.role is distinct from old.role then
    raise exception 'role is immutable once set'
      using errcode = '42501'; -- insufficient_privilege
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_role_immutable on public.profiles;
create trigger enforce_role_immutable
  before update on public.profiles
  for each row execute procedure public.enforce_role_immutable();

-- ── updated_at maintenance ───────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
