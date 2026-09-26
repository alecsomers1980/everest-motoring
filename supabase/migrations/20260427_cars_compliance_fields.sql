-- Compliance / disclosure fields for vehicle listings.
-- Required at the form level, but stored as nullable so existing rows
-- don't fail and can be back-filled progressively.

alter table public.cars
    add column if not exists sold_roadworthy boolean,
    add column if not exists eligible_for_finance boolean;
