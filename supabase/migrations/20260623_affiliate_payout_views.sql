-- Audit log: records every time an admin views an affiliate's decrypted bank details.
create table if not exists affiliate_payout_views (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid references auth.users(id) on delete set null,
    affiliate_id uuid not null references auth.users(id) on delete cascade,
    viewed_at timestamptz not null default now()
);

-- No policies defined: RLS denies all anon/authenticated access by default.
-- Reads/writes only happen server-side via the service-role admin client.
alter table affiliate_payout_views enable row level security;
