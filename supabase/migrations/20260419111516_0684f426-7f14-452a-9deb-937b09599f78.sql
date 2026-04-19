ALTER TABLE public.donations 
  ADD COLUMN IF NOT EXISTS donor_type text NOT NULL DEFAULT 'particulier',
  ADD COLUMN IF NOT EXISTS donor_company_name text,
  ADD COLUMN IF NOT EXISTS donor_siret text;