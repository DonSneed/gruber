-- Everyday Manager: per-profile theme color
-- Lets each household member pick their own page background from a small
-- set of presets (see src/lib/themes.ts).

alter table profiles add column theme_color text not null default '#232d23';