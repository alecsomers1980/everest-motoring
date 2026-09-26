-- Adds the additional fields required to export listings to AutoTrader and Cars.co.za.
-- All columns are nullable so existing rows remain valid.

alter table public.cars
    -- Vehicle Identification
    add column if not exists stock_number text,
    add column if not exists vin text,
    add column if not exists registration_number text,

    -- Vehicle Details
    add column if not exists registration_year int,
    add column if not exists condition text,                  -- 'new' | 'used'
    add column if not exists colour text,
    add column if not exists manufacturer_colour text,
    add column if not exists previous_owners int,
    add column if not exists service_history text,            -- 'full_franchise' | 'full' | 'full_non_franchise' | 'full_partial_franchise' | 'partial' | 'none' | 'not_applicable'
    add column if not exists accident_involved boolean,
    add column if not exists demo_vehicle boolean default false,
    add column if not exists code_3 boolean default false,
    add column if not exists accessible_vehicle boolean default false,
    add column if not exists armoured_vehicle boolean default false,

    -- Warranty
    add column if not exists has_warranty boolean,
    add column if not exists warranty_end_date date,
    add column if not exists warranty_mileage int,

    -- Pricing
    add column if not exists trade_in_price numeric,
    add column if not exists reconditioning_cost numeric,
    add column if not exists price_on_application boolean default false,

    -- Image classification (per-image metadata keyed by URL)
    -- Shape: [{ "url": "...", "category": "front" | "rear" | "interior" | ... }]
    add column if not exists gallery_meta jsonb default '[]'::jsonb,

    -- Inspection report
    add column if not exists inspection_report_url text;

-- VIN lookups will be common when reconciling exports/imports.
create unique index if not exists cars_vin_unique_idx on public.cars(vin) where vin is not null;
create index if not exists cars_stock_number_idx on public.cars(stock_number);
