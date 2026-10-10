-- Finance houses (banks) that can be the title holder on a financed sale.
-- /admin/paperwork uses them to fill RLV Part A and NCO Part B.
create table if not exists public.finance_houses (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    id_type text check (id_type in ('business_reg', 'traffic_register')),
    id_number text,
    nature text check (nature in ('private_company', 'close_corporation', 'other')),
    nature_other text,
    email text,
    phone_code text,
    phone_number text,
    fax_code text,
    fax_number text,
    postal_line1 text,
    postal_line2 text,
    postal_line3 text,
    postal_suburb text,
    postal_city text,
    postal_code text,
    street_line1 text,
    street_line2 text,
    street_line3 text,
    street_suburb text,
    street_city text,
    street_code text,
    notices_to text check (notices_to in ('postal', 'street')),
    proxy_id_type text check (proxy_id_type in ('traffic_register', 'rsa_id', 'foreign_id')),
    proxy_id_number text,
    proxy_surname text,
    proxy_initials text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- No policies: RLS denies all anon/authenticated access. Reads and writes go
-- through admin-checked server actions using the service-role client.
alter table public.finance_houses enable row level security;
