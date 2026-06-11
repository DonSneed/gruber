-- Everyday Manager: household invites
-- Lets an existing member generate a single-use code that a new signup can
-- redeem to join their household as an adult profile.

create table invites (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  code       text not null unique,
  role       text not null default 'adult' check (role in ('adult', 'child')),
  created_by uuid references profiles (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at    timestamptz,
  used_by    uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index invites_family_id_idx on invites (family_id);
create index invites_code_idx on invites (code);

alter table invites enable row level security;

-- Members can see their household's invites (e.g. to show "pending invite" in the UI).
-- Creating/redeeming invites goes through the RPCs below, not direct inserts.
create policy "Members can view their family's invites" on invites
  for select using (family_id = current_family_id());

-- ============================================================================
-- create_invite: any household member generates a single-use code for their
-- own family. Always issues an 'adult' invite (kids don't need invite links —
-- an adult creates their profile directly).
-- ============================================================================

create function create_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_family_id  uuid;
  caller_profile_id uuid;
  new_code text;
begin
  select family_id, id into caller_family_id, caller_profile_id
  from profiles where auth_user_id = auth.uid();

  if caller_family_id is null then
    raise exception 'You must belong to a family to create an invite';
  end if;

  new_code := encode(gen_random_bytes(5), 'hex');

  insert into invites (family_id, code, created_by)
  values (caller_family_id, new_code, caller_profile_id);

  return new_code;
end;
$$;

grant execute on function create_invite() to authenticated;

-- ============================================================================
-- redeem_invite: a logged-in user with no family yet uses a code to join the
-- inviting household as an adult profile. Marks the invite used so it can't
-- be redeemed again.
-- ============================================================================

create function redeem_invite(invite_code text, display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_invite invites%rowtype;
  new_profile_id uuid;
begin
  if exists (select 1 from profiles where auth_user_id = auth.uid()) then
    raise exception 'User already belongs to a family';
  end if;

  select * into matched_invite
  from invites
  where code = invite_code and used_at is null and expires_at > now()
  for update;

  if not found then
    raise exception 'Invalid or expired invite code';
  end if;

  insert into profiles (family_id, display_name, role, auth_user_id)
  values (matched_invite.family_id, display_name, matched_invite.role, auth.uid())
  returning id into new_profile_id;

  update invites
  set used_at = now(), used_by = new_profile_id
  where id = matched_invite.id;

  return matched_invite.family_id;
end;
$$;

grant execute on function redeem_invite(text, text) to authenticated;
