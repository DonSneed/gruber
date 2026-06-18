create table suggestions (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  created_by uuid references profiles (id) on delete set null,
  title      text not null,
  status     text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now()
);

create index suggestions_family_id_idx on suggestions (family_id);

alter table suggestions enable row level security;

create policy "Members can view their family's suggestions" on suggestions
  for select using (family_id = current_family_id());

create policy "Members can add suggestions" on suggestions
  for insert with check (family_id = current_family_id());

create policy "Members can update suggestions" on suggestions
  for update using (family_id = current_family_id());

create policy "Members can delete their own suggestions" on suggestions
  for delete using (
    family_id = current_family_id()
    and created_by = current_profile_id()
  );
