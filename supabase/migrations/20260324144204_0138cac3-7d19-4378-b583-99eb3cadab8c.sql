ALTER TABLE public.synagogue_profiles
  ADD COLUMN IF NOT EXISTS mikve_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mikve_winter_hours text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mikve_summer_hours text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mikve_phone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mikve_maps_link text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS donation_link text DEFAULT NULL;