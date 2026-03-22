-- Enable RLS on shabbat_push_log (only service role should access it)
ALTER TABLE public.shabbat_push_log ENABLE ROW LEVEL SECURITY;

-- No public policies needed - only service role accesses this table