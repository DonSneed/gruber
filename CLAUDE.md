# Everyday Manager — family task / calendar / memory app

Personal project by Sneed. Built for his family (him, fiancée, future kids) as a shared daily planner that doubles as a memory journal. Also a learning project: Sneed has web dev basics and wants to grow his programming and project-management skills — explain non-obvious decisions and changes rather than just making them.

## Product concept

- Self-management + shared family planning: see each other's tasks and schedules.
- Jira-like "stories" with subtasks, but for family life (e.g. story "Learn about insects" with tasks "catch a butterfly", "read a book about it") — not just chores.
- The memory angle is the differentiator: stories accumulate photos/notes over time into a family journal as a side effect of daily use.
- Closed family environment, eventually multiple families never see each other's data.

## Stack (decided)

- Frontend: React + TypeScript PWA. One codebase for desktop PC and Android. No iOS support needed.
- Backend: Supabase (Postgres, Auth, row-level security, realtime, Storage later).
- Privacy note: Sneed accepted public cloud reluctantly. Keep the self-host escape hatch real: standard SQL, periodic DB exports, no Supabase-proprietary lock-in where avoidable. Strict RLS from day one on every table.

## Data model (agreed)

```
families      id, name
profiles      id, family_id, display_name, role (adult/child), auth_user_id (nullable)
stories       id, family_id, title, description, status, created_by, cover_photo?
tasks         id, story_id (nullable), family_id, title, status, assignee_id,
              due_date?, scheduled_start?, scheduled_end?, completed_at?
events        id, family_id, title, start, end, owner_id, visibility
```

Key choices:
- `tasks.story_id` nullable: tasks can belong to a story or stand alone.
- Tasks carry their own `scheduled_start/end`: a scheduled task IS a calendar entry. The day view merges tasks-with-times + events.
- `profiles.auth_user_id` nullable: kids exist as managed profiles (assignable, on calendar, no login). Later a real login is attached to the existing profile and history carries over.
- Tasks can be created already completed (`completed_at`) to log things that already happened ("kid drew for an hour") — this back-fills the journal.
- Keep schema names boring and self-describing: it doubles as the AI interface (see below).

## UI (agreed, mockups reviewed)

Mobile-first, three screens behind a bottom nav (Today / Stories / Calendar):
- Today (home): merged timeline of both adults' events + scheduled tasks, color per person; unscheduled tasks due today as checklist below.
- Stories: list of cards on mobile (progress bar, x of y tasks, assignee), kanban board on desktop. Statuses just active/done.
- Story detail: description, task checklist, Memories photo strip (placeholder in MVP, real photos later).
- Calendar tab: week view, same person colors.

## Milestones

1. Scaffold + Supabase project + auth + family/profile creation
2. Stories + tasks CRUD (usable core)
3. Today view + calendar
4. PWA installability, polish
Later: photo memories (Supabase Storage), notifications, journal/timeline view, custom MCP server with domain tools (add_task, log_activity, whats_today) so the family can talk to the app via Claude. Until then, the official Supabase MCP connector gives Claude direct DB access for free.

## Open questions

- Recurring tasks (trash day etc.): MVP or later? Not yet decided.
- Fiancée's name/profile details not yet captured.

## Working style

- Sneed codes along with Claude's help; prefers concise, direct communication.
- Surface trade-offs before big decisions; he wants to make the calls.
