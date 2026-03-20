
-- Add first/last name to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;

-- Add president first/last name to synagogue_profiles
ALTER TABLE public.synagogue_profiles ADD COLUMN IF NOT EXISTS president_first_name text;
ALTER TABLE public.synagogue_profiles ADD COLUMN IF NOT EXISTS president_last_name text;
