create table if not exists public.car_events (
  id uuid primary key default gen_random_uuid(),
  event text not null check (event in ('deleted')),
  car_id uuid,
  make text,
  model text,
  year int,
  price numeric,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.car_events enable row level security;

create policy "admins manage car_events" on public.car_events
  for all using (exists (select 1 from public.profiles
    where id = auth.uid() and role = 'admin'));

create index if not exists car_events_created_at_idx on public.car_events(created_at);
