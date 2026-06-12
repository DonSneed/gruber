-- Everyday Manager: claimable profile invites
-- Lets a household member pre-create a profile (with stories, tasks, etc.
-- already set up) and later generate an invite that attaches a real login
-- to that EXISTING profile, instead of creating a brand new one.

alter table invites add column profile_id uuid references profiles (id) on delete cascade;

-- ============================================================================
-- create_profile_invite: generates a single-use code that attaches the
-- redeemer's login to an existing, not-yet-claimed profile in the caller's
-- family (e.g. a partner or kid profile created ahead of time via Settings).
-- ============================================================================

create function create_profile_invite(target_profile_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_family_id  uuid;
  caller_profile_id uuid;
  target_family_id  uuid;
  target_claimed    uuid;
  new_code text;
begin
  select family_id, id into caller_family_id, caller_profile_id
  from profiles where auth_user_id = auth.uid();

  if caller_family_id is null then
    raise exception 'You must belong to a family to create an invite';
  end if;

  select family_id, auth_user_id into target_family_id, target_claimed
  from profiles where id = target_profile_id;

  if target_family_id is null or target_family_id <> caller_family_id then
    raise exception 'Profile not found in your family';
  end if;

  if target_claimed is not null then
    raise exception 'This profile already has a login';
  end if;

  new_code := encode(gen_random_bytes(5), 'hex');

  insert into invites (family_id, code, created_by, profile_id)
  values (caller_family_id, new_code, caller_profile_id, target_profile_id);

  return new_code;
end;
$$;

grant execute on function create_profile_invite(uuid) to authenticated;

-- ============================================================================
-- redeem_invite: extended to handle profile invites. If the invite targets
-- an existing profile, attach the redeemer's login to it (keeping its
-- existing display name and any stories/tasks already assigned to it)
-- instead of creating a new profile.
-- ============================================================================

create or replace function redeem_invite(invite_code text, display_name text)
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

  if matched_invite.profile_id is not null then
    update profiles
    set auth_user_id = auth.uid()
    where id = matched_invite.profile_id and auth_user_id is null
    returning id into new_profile_id;

    if new_profile_id is null then
      raise exception 'This profile already has a login';
    end if;
  else
    insert into profiles (family_id, display_name, role, auth_user_id)
    values (matched_invite.family_id, display_name, matched_invite.role, auth.uid())
    returning id into new_profile_id;
  end if;

  update invites
  set used_at = now(), used_by = new_profile_id
  where id = matched_invite.id;

  return matched_invite.family_id;
end;
$$;