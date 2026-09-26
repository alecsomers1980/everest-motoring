-- Latest News: monthly SEO blog posts (buying guides, local SEO, model reviews).
-- Public read for published posts; admin-only write.
create table if not exists public.news_posts (
    id uuid primary key default gen_random_uuid(),
    slug text unique not null,
    title text not null,
    excerpt text,
    hero_image_url text,
    body_md text not null,
    category text not null check (category in ('buying-guide', 'local', 'model-review')),
    featured_car_id uuid references public.cars(id) on delete set null,
    meta_title text,
    meta_description text,
    reading_minutes int,
    status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
    published_at timestamptz,
    generated_by_ai boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references auth.users(id) on delete set null
);

create index if not exists news_posts_status_published_idx
    on public.news_posts(status, published_at desc);
create index if not exists news_posts_category_idx on public.news_posts(category);

create or replace function public.news_posts_touch_updated()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists news_posts_touch on public.news_posts;
create trigger news_posts_touch
    before update on public.news_posts
    for each row execute function public.news_posts_touch_updated();

alter table public.news_posts enable row level security;

drop policy if exists "public read published news" on public.news_posts;
create policy "public read published news" on public.news_posts
    for select using (status = 'published');

drop policy if exists "admins manage news" on public.news_posts;
create policy "admins manage news" on public.news_posts
    for all
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Storage bucket for hero images (public read so URLs can be embedded without signing).
insert into storage.buckets (id, name, public)
    values ('news-images', 'news-images', true)
    on conflict (id) do nothing;

drop policy if exists "public read news images" on storage.objects;
create policy "public read news images" on storage.objects
    for select using (bucket_id = 'news-images');

drop policy if exists "admins upload news images" on storage.objects;
create policy "admins upload news images" on storage.objects
    for insert
    with check (
        bucket_id = 'news-images'
        and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    );

drop policy if exists "admins update news images" on storage.objects;
create policy "admins update news images" on storage.objects
    for update
    using (
        bucket_id = 'news-images'
        and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    );
