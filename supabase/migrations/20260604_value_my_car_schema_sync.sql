-- The value_my_car (Trade In / Sell Your Car) form + admin dashboard were
-- upgraded to a richer schema (split make/model, fuel/transmission/condition,
-- email, location, notes, category) but the table was never migrated, so every
-- submission failed on the missing columns. Add them, and relax the old
-- not-null columns the new form no longer fills.
alter table public.value_my_car_requests
  add column if not exists category text,
  add column if not exists make text,
  add column if not exists model text,
  add column if not exists fuel_type text,
  add column if not exists transmission text,
  add column if not exists condition text,
  add column if not exists additional_notes text,
  add column if not exists client_email text,
  add column if not exists client_province text,
  add column if not exists client_suburb text,
  add column if not exists image_interior_front text,
  add column if not exists image_interior_back text;

alter table public.value_my_car_requests alter column make_model drop not null;
alter table public.value_my_car_requests alter column registration_number drop not null;
