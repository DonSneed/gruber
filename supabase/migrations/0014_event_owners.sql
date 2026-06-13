-- Events can belong to multiple people (e.g. a date night both partners
-- want logged), so replace the single owner_id column with a join table,
-- mirroring task_assignees.

create table event_owners (
  event_id   uuid not null references events (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  primary key (event_id, profile_id)
);

create index event_owners_profile_id_idx on event_owners (profile_id);

insert into event_owners (event_id, profile_id)
select id, owner_id from events where owner_id is not null;

alter table events drop column owner_id;

alter table event_owners enable row level security;

create policy "Members can view their family's event owners" on event_owners
  for select using (
    exists (
      select 1 from events
      where events.id = event_owners.event_id and events.family_id = current_family_id()
    )
  );

create policy "Members can assign their family's events" on event_owners
  for insert with check (
    exists (
      select 1 from events
      where events.id = event_owners.event_id and events.family_id = current_family_id()
    )
  );

create policy "Members can unassign their family's events" on event_owners
  for delete using (
    exists (
      select 1 from events
      where events.id = event_owners.event_id and events.family_id = current_family_id()
    )
  );
