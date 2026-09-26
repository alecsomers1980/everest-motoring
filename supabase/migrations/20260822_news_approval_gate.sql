-- Human-review gate for AI-generated news articles.
-- Drafts are generated on the 1st, approved by the editor, and published on the
-- 7th and 21st. Nothing reaches the public without an approval.

alter table public.news_posts drop constraint if exists news_posts_status_check;
alter table public.news_posts add constraint news_posts_status_check
    check (status in ('draft', 'approved', 'published', 'archived'));

alter table public.news_posts add column if not exists scheduled_for date;

create index if not exists news_posts_scheduled_idx
    on public.news_posts(status, scheduled_for);
