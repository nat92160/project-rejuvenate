ALTER TABLE public.donations 
ADD COLUMN IF NOT EXISTS payout_marked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payout_marked_by uuid,
ADD COLUMN IF NOT EXISTS payout_note text;