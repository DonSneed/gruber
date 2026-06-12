-- Everyday Manager: task flags (personal categories)
-- Each profile can create their own named, colored flags (e.g. "Work",
-- "Errands"). Flags are visible to the whole family so shared tasks can
-- carry multiple people's categorization, and any member can attach/remove
-- a flag from a task they can see.

-- ============================================================================
-- Helper: which profile is the current logged-in user?
-- security definer + fixed search_path, mirrors current_family_id().
-- ============================================================================

create function current_profile_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from profiles where auth_user_id = auth.uid()
$$;

create table flags (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  name       text not null,
  color      text not null default '#6d6a61',
  created_at timestamptz not null default now(),
  unique (profile_id, name)
);

create index flags_family_id_idx on flags (family_id);

alter table flags enable row level security;

create policy "Members can view their family's flags" on flags
  for select using (family_id = current_family_id());

create policy "Members can create their own flags" on flags
  for insert with check (family_id = current_family_id() and profile_id = current_profile_id());

create policy "Members can delete their own flags" on flags
  for delete using (profile_id = current_profile_id());

create table task_flags (
  task_id uuid not null references tasks (id) on delete cascade,
  flag_id uuid not null references flags (id) on delete cascade,
  primary key (task_id, flag_id)
);

create index task_flags_flag_id_idx on task_flags (flag_id);

alter table task_flags enable row level security;

create policy "Members can view their family's task flags" on task_flags
  for select using (
    exists (
      select 1 from tasks
      where tasks.id = task_flags.task_id and tasks.family_id = current_family_id()
    )
  );

create policy "Members can assign flags to their family's tasks" on task_flags
  for insert with check (
    exists (
      select 1 from tasks
      where tasks.id = task_flags.task_id and tasks.family_id = current_family_id()
    )
  );

create policy "Members can remove flags from their family's tasks" on task_flags
  for delete using (
    exists (
      select 1 from tasks
      where tasks.id = task_flags.task_id and tasks.family_id = current_family_id()
    )
  );
