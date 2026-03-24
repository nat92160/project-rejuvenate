
ALTER TABLE public.donations 
ADD COLUMN donor_address text NOT NULL DEFAULT '',
ADD COLUMN cerfa_token uuid DEFAULT gen_random_uuid();
