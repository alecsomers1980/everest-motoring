-- Sales table tracks completed vehicle sales for review automation + record-keeping
-- One sale per car (typical case); cascades if a car is deleted.
create table if not exists public.sales (
    id uuid primary key default gen_random_uuid(),
    car_id uuid not null references public.cars(id) on delete cascade,
    lead_id uuid references public.leads(id) on delete set null,
    buyer_name text not null,
    buyer_email text,
    buyer_phone text,
    delivery_photo_url text,
    notes text,
    sold_at timestamptz not null default now(),
    review_email_scheduled_for timestamptz,
    review_email_sent_at timestamptz,
    review_email_id text,
    created_at timestamptz not null default now(),
    created_by uuid references auth.users(id) on delete set null
);

create index if not exists sales_car_id_idx on public.sales(car_id);
create index if not exists sales_lead_id_idx on public.sales(lead_id);

alter table public.sales enable row level security;

drop policy if exists "admins can manage sales" on public.sales;
create policy "admins can manage sales" on public.sales
    for all
    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Storage bucket for the "customer collecting their car" photos.
-- Public so the URL can be embedded directly in the review email and (later) social clips.
insert into storage.buckets (id, name, public)
    values ('delivery-photos', 'delivery-photos', true)
    on conflict (id) do nothing;

drop policy if exists "public read delivery photos" on storage.objects;
create policy "public read delivery photos" on storage.objects
    for select using (bucket_id = 'delivery-photos');

drop policy if exists "admins upload delivery photos" on storage.objects;
create policy "admins upload delivery photos" on storage.objects
    for insert
    with check (
        bucket_id = 'delivery-photos'
        and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    );
