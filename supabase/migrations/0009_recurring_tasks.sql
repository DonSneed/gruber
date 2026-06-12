-- Everyday Manager: recurring tasks
-- A recurring_tasks row is a template (e.g. "Take out trash" on Mon/Thu).
-- The client materializes it into a normal `tasks` row for "today" the
-- first time someone opens the app on a matching day, so recurring items
-- behave exactly like any other task (checkable, schedulable, deletable for
-- that day) without a server-side scheduler.

create table recurring_tasks (
  id                   uuid primary key default gen_random_uuid(),
  family_id            uuid not null references families (id) on delete cascade,
  story_id             uuid references stories (id) on delete cascade,
  title                text not null,
  days_of_week         int[] not null, -- 0 = Sunday .. 6 = Saturday (matches JS Date#getDay)
  scheduled_start_time time,
  scheduled_end_time   time,
  created_by           uuid references profiles (id) on delete set null,
  active               boolean not null default true,
  created_at           timestamptz not null default now()
);

create index recurring_tasks_family_id_idx on recurring_tasks (family_id);

alter table recurring_tasks enable row level security;

create policy "Members can view their family's recurring tasks" on recurring_tasks
  for select using (family_id = current_family_id());

create policy "Members can create recurring tasks for their family" on recurring_tasks
  for insert with check (family_id = current_family_id());

create policy "Members can update their family's recurring tasks" on recurring_tasks
  for update using (family_id = current_family_id());

create policy "Members can delete their family's recurring tasks" on recurring_tasks
  for delete using (family_id = current_family_id());

-- "set null" (not cascade): deleting a recurring template shouldn't wipe the
-- journal history of tasks it already created.
alter table tasks add column recurring_task_id uuid references recurring_tasks (id) on delete set null;
create index tasks_recurring_task_id_idx on tasks (recurring_task_id);