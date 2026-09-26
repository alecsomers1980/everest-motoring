-- Off-inventory sales + "don't post to social" toggle.
--
-- 1. Some vehicles are sold that were never listed in the cars table. Allow a
--    sale to exist without a car_id and carry the vehicle details itself so the
--    same post-sale automation (review email, handover video, social) can run.
-- 2. skip_social lets an admin record a sale that should NOT be posted to social
--    media. When set, the "Just Sold" celebration post is suppressed and the
--    review email omits the "watch it on Facebook" mention.

alter table public.sales
    alter column car_id drop not null;

alter table public.sales
    add column if not exists vehicle_year integer,
    add column if not exists vehicle_make text,
    add column if not exists vehicle_model text,
    add column if not exists vehicle_image_url text,
    add column if not exists skip_social boolean not null default false;
