
ALTER TABLE public.prayer_time_suggestions
  ALTER COLUMN synagogue_id DROP NOT NULL,
  ADD COLUMN place_id text,
  ADD COLUMN place_name text;
