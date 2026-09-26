-- Adds Seedance 2 delivery-video fields to sales + a public bucket for the finished clips.
-- The video is generated from the delivery photo and embedded (as a thumbnail link)
-- in the 4-day post-sale review email + shared to social.

alter table public.sales
    add column if not exists sale_video_style text
        check (sale_video_style in ('timelapse', 'showroom', 'orbit')),
    add column if not exists sale_video_task_id text,
    add column if not exists sale_video_url text,
    add column if not exists sale_video_status text not null default 'none'
        check (sale_video_status in ('none', 'generating', 'ready', 'failed')),
    add column if not exists sale_video_error text,
    add column if not exists sale_video_started_at timestamptz,
    add column if not exists sale_video_completed_at timestamptz;

create index if not exists sales_video_status_idx on public.sales(sale_video_status);

-- Public bucket for rendered sale videos so the URL can be referenced from email + social posts.
insert into storage.buckets (id, name, public)
    values ('sale-videos', 'sale-videos', true)
    on conflict (id) do nothing;

drop policy if exists "public read sale videos" on storage.objects;
create policy "public read sale videos" on storage.objects
    for select using (bucket_id = 'sale-videos');

drop policy if exists "admins upload sale videos" on storage.objects;
create policy "admins upload sale videos" on storage.objects
    for insert
    with check (
        bucket_id = 'sale-videos'
        and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    );
