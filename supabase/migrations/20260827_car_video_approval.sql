-- Approval gate for the AI walkaround video.
-- A new car's photo/spec feed post goes out automatically, but the two
-- video-bearing posts (reel + full walkthrough) wait until the video has been
-- reviewed and approved.

alter table public.cars
    -- null until the approval email is sent, then pending -> approved/rejected
    add column if not exists video_approval_status text,
    -- stops the per-minute pipeline cron re-sending the approval email
    add column if not exists video_approval_emailed_at timestamptz,
    -- atomic claim: set once the reel + video posts have been created
    add column if not exists video_social_posted_at timestamptz,
    -- the feed post's slot, also used to work out which slots are taken
    add column if not exists feed_post_scheduled_at timestamptz;

alter table public.cars drop constraint if exists cars_video_approval_status_check;
alter table public.cars add constraint cars_video_approval_status_check
    check (video_approval_status in ('pending', 'approved', 'rejected'));

-- Slot allocation reads upcoming feed posts on every new-car save.
create index if not exists cars_feed_post_scheduled_idx
    on public.cars(feed_post_scheduled_at);
