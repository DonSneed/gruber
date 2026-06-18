-- Replace gen_random_bytes (pgcrypto) with gen_random_uuid() (built-in).
-- gen_random_uuid() is available in Postgres 13+ without any extension.

create or replace function create_invite()
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

  new_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

  insert into invites (family_id, code, created_by)
  values (caller_family_id, new_code, caller_profile_id);

  return new_code;
end;
$$;

create or replace function create_profile_invite(target_profile_id uuid)
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

  new_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

  insert into invites (family_id, code, created_by, profile_id)
  values (caller_family_id, new_code, caller_profile_id, target_profile_id);

  return new_code;
end;
$$;
