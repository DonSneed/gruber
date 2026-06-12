-- Everyday Manager: photo memories
-- Lets family members attach photos to stories and tasks. Files live in a
-- private "memories" storage bucket under <family_id>/<uuid>.jpg, and each
-- upload gets a row here linking it back to its story/task.

create table photos (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families (id) on delete cascade,
  story_id     uuid references stories (id) on delete cascade,
  task_id      uuid references tasks (id) on delete cascade,
  storage_path text not null,
  created_by   uuid references profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index photos_family_id_idx on photos (family_id);
create index photos_story_id_idx on photos (story_id);
create index photos_task_id_idx on photos (task_id);

alter table photos enable row level security;

create policy "Members can view their family's photos" on photos
  for select using (family_id = current_family_id());

create policy "Members can add photos to their family" on photos
  for insert with check (family_id = current_family_id());

create policy "Members can delete their family's photos" on photos
  for delete using (family_id = current_family_id());

-- ============================================================================
-- Storage bucket + policies. Files are private; access is granted per-family
-- by checking the first path segment (<family_id>/...) against the caller's
-- own family.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('memories', 'memories', false)
on conflict (id) do nothing;

create policy "Members can read their family's memory photos" on storage.objects
  for select using (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] = current_family_id()::text
  );

create policy "Members can upload memory photos for their family" on storage.objects
  for insert with check (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] = current_family_id()::text
  );

create policy "Members can delete their family's memory photos" on storage.objects
  for delete using (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] = current_family_id()::text
  );