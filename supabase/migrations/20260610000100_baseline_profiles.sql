-- ─────────────────────────────────────────────────────────────────────────────
-- Baseline schema: profiles
--
-- Captures the schema this app depends on so the database is version-controlled
-- (single source of truth for both the Expo client and any future backend
-- service). All statements are idempotent so this migration can be pushed onto
-- the existing remote project without conflict.
-- ─────────────────────────────────────────────────────────────────────────────

-- Roles a user can hold. Stored as text + check constraint (not a Postgres enum)
-- so adding roles later is a single constraint swap, not a type migration.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role text check (role in ('fan', 'comedian', 'venue')),
  home_city text,
  home_latitude double precision,
  home_longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'App profile per auth user. Row is created by the on_auth_user_created trigger; role is set once and is then immutable (see security_hardening migration).';

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
-- Defense in depth: applies RLS even to the table owner.
alter table public.profiles force row level security;

-- Profiles contain precise home coordinates — restrict reads to the owner.
-- Public-facing comedian/venue data should be exposed via dedicated views
-- with explicit column allowlists, never by widening this policy.
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- No INSERT/DELETE policies on purpose: rows are created exclusively by the
-- security-definer trigger below and removed via the auth.users cascade.

-- ── Auto-create a profile row on sign-up ─────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    -- Only accept known roles from sign-up metadata; anything else stays null
    -- until the user picks a role in-app.
    case
      when new.raw_user_meta_data ->> 'role' in ('fan', 'comedian', 'venue')
        then new.raw_user_meta_data ->> 'role'
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
