-- gen_random_bytes() (used by create_invite) lives in pgcrypto, which isn't
-- enabled by default. gen_random_uuid() doesn't need this — it's built into
-- Postgres core since v13.

create extension if not exists pgcrypto with schema extensions;

alter function create_invite() set search_path = public, extensions;