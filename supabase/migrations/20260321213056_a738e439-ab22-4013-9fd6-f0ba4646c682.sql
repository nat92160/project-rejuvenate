
ALTER TABLE public.synagogue_profiles
  ADD COLUMN IF NOT EXISTS shacharit_time text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS minha_time text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS arvit_time text DEFAULT NULL;
