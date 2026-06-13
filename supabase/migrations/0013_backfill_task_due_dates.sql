-- Unscheduled tasks created without a due_date (e.g. via story task forms before
-- this was set on insert) never showed up in Today/Calendar. Backfill them to
-- their creation date so they appear (and carry over if still incomplete).
update tasks
set due_date = created_at::date
where due_date is null
  and scheduled_start is null;
