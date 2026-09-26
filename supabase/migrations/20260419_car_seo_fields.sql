-- SEO auto-fix fields for car listings.
-- Title/description override the computed fallbacks in /inventory/[id] generateMetadata.
-- image_alts is a jsonb array of { url, alt } objects keyed by image URL.
alter table public.cars
    add column if not exists seo_meta_title text,
    add column if not exists seo_meta_description text,
    add column if not exists image_alts jsonb default '[]'::jsonb,
    add column if not exists seo_updated_at timestamptz;

create index if not exists cars_seo_updated_at_idx on public.cars(seo_updated_at);
