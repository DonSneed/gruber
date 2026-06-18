create table movies (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families (id) on delete cascade,
  title        text not null,
  status       text not null default 'to_watch' check (status in ('to_watch', 'watched')),
  suggested_by uuid references profiles (id) on delete set null,
  watched_at   date,
  notes        text,
  created_at   timestamptz not null default now()
);

create index movies_family_id_idx on movies (family_id);

alter table movies enable row level security;

create policy "Members can view their family's movies" on movies
  for select using (family_id = current_family_id());

create policy "Members can add movies" on movies
  for insert with check (family_id = current_family_id());

create policy "Members can update their family's movies" on movies
  for update using (family_id = current_family_id());

create policy "Members can delete their family's movies" on movies
  for delete using (family_id = current_family_id());
