ALTER TABLE public.synagogue_profiles 
ADD COLUMN IF NOT EXISTS donation_slug text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_synagogue_profiles_donation_slug 
ON public.synagogue_profiles(donation_slug) 
WHERE donation_slug IS NOT NULL;