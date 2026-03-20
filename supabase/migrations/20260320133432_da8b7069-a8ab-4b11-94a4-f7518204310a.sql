
-- Table to persist Shabbat poster form data per president
CREATE TABLE public.shabbat_posters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.shabbat_posters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own poster data"
  ON public.shabbat_posters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own poster data"
  ON public.shabbat_posters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own poster data"
  ON public.shabbat_posters FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_shabbat_posters_updated_at
  BEFORE UPDATE ON public.shabbat_posters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
