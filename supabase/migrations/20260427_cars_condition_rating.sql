-- Adds the Cars.co.za-style condition rating ('New', 'Excellent', 'Good',
-- 'Average', 'Poor', 'Non-runner'). Separate from the existing `condition`
-- column which AutoTrader uses to distinguish new vs used.

alter table public.cars
    add column if not exists condition_rating text;
