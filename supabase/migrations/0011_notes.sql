-- Everyday Manager: text notes
-- Lets family members attach short text notes to stories and tasks, the
-- same way photos can be attached. Mirrors the photos table/RLS shape.

create table notes (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families (id) on delete cascade,
  story_id    uuid references stories (id) on delete cascade,
  task_id     uuid references tasks (id) on delete cascade,
  content     text not null,
  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index notes_family_id_idx on notes (family_id);
create index notes_story_id_idx on notes (story_id);
create index notes_task_id_idx on notes (task_id);

alter table notes enable row level security;

create policy "Members can view their family's notes" on notes
  for select using (family_id = current_family_id());

create policy "Members can add notes to their family" on notes
  for insert with check (family_id = current_family_id());

create policy "Members can delete their family's notes" on notes
  for delete using (family_id = current_family_id());
