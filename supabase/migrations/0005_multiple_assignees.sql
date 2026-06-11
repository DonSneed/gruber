-- Tasks can be shared by multiple people (e.g. a chore both parents help
-- with), so replace the single assignee_id column with a join table.

alter table tasks drop column assignee_id;

create table task_assignees (
  task_id    uuid not null references tasks (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  primary key (task_id, profile_id)
);

create index task_assignees_profile_id_idx on task_assignees (profile_id);

alter table task_assignees enable row level security;

create policy "Members can view their family's task assignees" on task_assignees
  for select using (
    exists (
      select 1 from tasks
      where tasks.id = task_assignees.task_id and tasks.family_id = current_family_id()
    )
  );

create policy "Members can assign their family's tasks" on task_assignees
  for insert with check (
    exists (
      select 1 from tasks
      where tasks.id = task_assignees.task_id and tasks.family_id = current_family_id()
    )
  );

create policy "Members can unassign their family's tasks" on task_assignees
  for delete using (
    exists (
      select 1 from tasks
      where tasks.id = task_assignees.task_id and tasks.family_id = current_family_id()
    )
  );