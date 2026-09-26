-- The `leads_car_id_fkey` constraint on public.leads currently has no
-- ON DELETE behaviour, which blocks deletion of any car that has linked
-- inquiries. We don't want to lose the lead (customer contact info is
-- valuable) — so set car_id to NULL when a car is deleted, preserving
-- the lead row.

alter table public.leads
    drop constraint if exists leads_car_id_fkey;

alter table public.leads
    add constraint leads_car_id_fkey
    foreign key (car_id) references public.cars(id) on delete set null;
