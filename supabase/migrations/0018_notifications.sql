-- Push subscription per browser/device per profile
create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_profile_id_idx on push_subscriptions (profile_id);

alter table push_subscriptions enable row level security;

-- Only the owning profile can manage their subscriptions
create policy "Own push subscriptions" on push_subscriptions
  for all using (profile_id = current_profile_id())
  with check (profile_id = current_profile_id());

-- Love message config (one per family, editable by Enrico)
create table love_message_config (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade unique,
  message    text not null default 'Ich liebe dich, Dinachka :)',
  active     boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table love_message_config enable row level security;

create policy "Members can view love message config" on love_message_config
  for select using (family_id = current_family_id());

create policy "Members can upsert love message config" on love_message_config
  for insert with check (family_id = current_family_id());

create policy "Members can update love message config" on love_message_config
  for update using (family_id = current_family_id());

-- Track sent notifications per day to avoid duplicates
create table love_notifications_log (
  family_id uuid not null references families (id) on delete cascade,
  sent_date date not null,
  primary key (family_id, sent_date)
);

alter table love_notifications_log enable row level security;

create policy "Members can view notification log" on love_notifications_log
  for select using (family_id = current_family_id());

create policy "Service can insert notification log" on love_notifications_log
  for insert with check (true);
