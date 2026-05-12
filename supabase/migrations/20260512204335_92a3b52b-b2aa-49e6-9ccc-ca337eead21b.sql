
CREATE TABLE public.hazkara_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deceased_name text NOT NULL,
  hebrew_day integer NOT NULL,
  hebrew_month text NOT NULL,
  hebrew_year integer NOT NULL,
  rite text NOT NULL DEFAULT 'sefarade',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hazkara_records_user_idx ON public.hazkara_records (user_id);

ALTER TABLE public.hazkara_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their hazkara records"
  ON public.hazkara_records FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
