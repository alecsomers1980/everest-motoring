-- Tracks the last time the AI walkaround pipeline made real progress on a car.
-- The advance-video cron stamps this on every step; a car that hasn't advanced
-- past a timeout is auto-failed so a stuck car can't block the render queue.
alter table public.cars add column if not exists ai_progress_at timestamptz;
