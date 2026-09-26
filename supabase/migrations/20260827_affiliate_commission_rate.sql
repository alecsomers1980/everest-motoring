-- Per-affiliate commission rate.
-- Was a flat R1000 hardcoded in the affiliate portal, the admin table and the
-- monthly report. New affiliates default to R1000. Clearing the field (NULL)
-- hides every commission amount from that affiliate's portal.

alter table public.profiles
    add column if not exists commission_per_deal numeric default 1000;

-- Existing affiliates keep the rate they were already effectively on.
update public.profiles
    set commission_per_deal = 1000
    where role = 'affiliate' and commission_per_deal is null;
