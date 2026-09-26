-- Capture the buyer's birthday at point of sale so we can send birthday emails
-- later (the Birthday email template already exists). Optional, date only.
alter table public.sales add column if not exists buyer_birthday date;
