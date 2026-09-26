-- Adds the drivetrain field for vehicles. Values are '2x4' (two-wheel
-- drive), '4x4' (four-wheel drive with low range / selectable), and
-- 'AWD' (all-wheel drive / full-time). Surfaced on the inventory list
-- cards, the vehicle detail page, and the AutoTrader / Cars.co.za XML
-- exports.

alter table public.cars
    add column if not exists drivetrain text;
