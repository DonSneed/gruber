-- Everyday Manager: initial schema (families, profiles, stories, tasks, events)
-- Run this in the Supabase SQL editor (or via `supabase db push` if using the CLI).

-- ============================================================================
-- Tables
-- ============================================================================

create table families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families (id) on delete cascade,
  display_name text not null,
  role         text not null default 'adult' check (role in ('adult', 'child')),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table stories (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families (id) on delete cascade,
  title        text not null,
  description  text,
  status       text not null default 'active' check (status in ('active', 'done')),
  created_by   uuid references profiles (id) on delete set null,
  cover_photo  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table tasks (
  id               uuid primary key default gen_random_uuid(),
  story_id         uuid references stories (id) on delete cascade,
  family_id        uuid not null references families (id) on delete cascade,
  title            text not null,
  status           text not null default 'todo' check (status in ('todo', 'done')),
  assignee_id      uuid references profiles (id) on delete set null,
  due_date         date,
  scheduled_start  timestamptz,
  scheduled_end    timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz not null default now()
);

create table events (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  title      text not null,
  start      timestamptz not null,
  "end"      timestamptz not null,
  owner_id   uuid references profiles (id) on delete set null,
  visibility text not null default 'family' check (visibility in ('private', 'family')),
  created_at timestamptz not null default now()
);

-- Indexes for the family_id lookups every RLS policy below relies on.
create index profiles_family_id_idx on profiles (family_id);
create index stories_family_id_idx on stories (family_id);
create index tasks_family_id_idx on tasks (family_id);
create index events_family_id_idx on events (family_id);
create index tasks_story_id_idx on tasks (story_id);

-- ============================================================================
-- Helper: which family does the current logged-in user belong to?
-- security definer + fixed search_path so it can read `profiles` regardless
-- of the caller's RLS, without being hijacked via search_path tricks.
-- ============================================================================

create function current_family_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select family_id from profiles where auth_user_id = auth.uid()
$$;

-- ============================================================================
-- Bootstrapping: a brand-new user has no family yet, so the normal
-- "family_id = current_family_id()" policies can't let them create one.
-- This function creates the family + the caller's own adult profile in one
-- atomic, security-definer step.
-- ============================================================================

create function create_family(family_name text, display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
begin
  if exists (select 1 from profiles where auth_user_id = auth.uid()) then
    raise exception 'User already belongs to a family';
  end if;

  insert into families (name) values (family_name) returning id into new_family_id;

  insert into profiles (family_id, display_name, role, auth_user_id)
  values (new_family_id, display_name, 'adult', auth.uid());

  return new_family_id;
end;
$$;

grant execute on function create_family(text, text) to authenticated;

-- ============================================================================
-- Row Level Security
-- Every table is scoped to the caller's family via current_family_id().
-- ============================================================================

alter table families enable row level security;
alter table profiles enable row level security;
alter table stories  enable row level security;
alter table tasks    enable row level security;
alter table events   enable row level security;

create policy "Members can view their family" on families
  for select using (id = current_family_id());

create policy "Members can view profiles in their family" on profiles
  for select using (family_id = current_family_id());

create policy "Members can update their own profile" on profiles
  for update using (auth_user_id = auth.uid());

create policy "Members can view their family's stories" on stories
  for select using (family_id = current_family_id());

create policy "Members can manage their family's stories" on stories
  for insert with check (family_id = current_family_id());

create policy "Members can update their family's stories" on stories
  for update using (family_id = current_family_id());

create policy "Members can delete their family's stories" on stories
  for delete using (family_id = current_family_id());

create policy "Members can view their family's tasks" on tasks
  for select using (family_id = current_family_id());

create policy "Members can create tasks in their family" on tasks
  for insert with check (family_id = current_family_id());

create policy "Members can update their family's tasks" on tasks
  for update using (family_id = current_family_id());

create policy "Members can delete their family's tasks" on tasks
  for delete using (family_id = current_family_id());

create policy "Members can view their family's events" on events
  for select using (family_id = current_family_id());

create policy "Members can create events in their family" on events
  for insert with check (family_id = current_family_id());

create policy "Members can update their family's events" on events
  for update using (family_id = current_family_id());

create policy "Members can delete their family's events" on events
  for delete using (family_id = current_family_id());
