-- Everyday Manager: allow photos and notes to attach to events too
-- (alongside the existing story_id / task_id targets).

alter table photos add column event_id uuid references events (id) on delete cascade;
create index photos_event_id_idx on photos (event_id);

alter table notes add column event_id uuid references events (id) on delete cascade;
create index notes_event_id_idx on notes (event_id);
