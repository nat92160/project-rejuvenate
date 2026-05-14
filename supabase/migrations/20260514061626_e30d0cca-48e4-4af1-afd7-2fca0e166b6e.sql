ALTER TABLE public.refoua_chelema 
  ADD COLUMN IF NOT EXISTS synagogue_ids uuid[] DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_refoua_synagogue_ids ON public.refoua_chelema USING GIN (synagogue_ids);