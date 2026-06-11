-- Lets an existing household member add another profile directly (e.g. a
-- child, or a non-tech-savvy partner) without going through signup/invites.
-- Safe as a plain RLS policy (unlike the bootstrap case): the caller already
-- has a verified family_id, and auth_user_id must be null so they can't use
-- this to attach a login to an arbitrary account.

create policy "Members can add profiles without a login to their family" on profiles
  for insert with check (family_id = current_family_id() and auth_user_id is null);