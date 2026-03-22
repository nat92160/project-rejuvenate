ALTER TABLE public.synagogue_profiles
  ADD COLUMN IF NOT EXISTS shacharit_time_2 text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS minha_time_2 text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS arvit_time_2 text DEFAULT NULL;