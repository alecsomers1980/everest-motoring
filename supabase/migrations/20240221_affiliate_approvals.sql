-- Migration: Add `is_approved` column to `profiles` to manage Affiliate activations
-- 1. Add column, default is false
ALTER TABLE public.profiles ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;

-- 2. Retroactively approve any existing Admin accounts (just in case they need it later)
UPDATE public.profiles SET is_approved = TRUE WHERE role = 'admin';

-- 3. Retroactively approve existing Affiliates (so current tests don't break immediately)
UPDATE public.profiles SET is_approved = TRUE WHERE role = 'affiliate';
