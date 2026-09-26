-- Widens sale_video_style check constraint to accept the new 16:9 scene keys
-- (dream_drive, reveal, hero_orbit). Old keys (timelapse, showroom, orbit)
-- kept so pre-existing rows don't violate the constraint.

alter table public.sales
    drop constraint if exists sales_sale_video_style_check;

alter table public.sales
    add constraint sales_sale_video_style_check
    check (
        sale_video_style is null
        or sale_video_style in (
            'dream_drive', 'reveal', 'hero_orbit', 'pixel_build',
            'timelapse', 'showroom', 'orbit'
        )
    );
