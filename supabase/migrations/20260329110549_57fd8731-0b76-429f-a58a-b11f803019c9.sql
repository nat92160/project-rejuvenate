
CREATE TABLE public.omer_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  omer_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  day_number integer NOT NULL CHECK (day_number BETWEEN 1 AND 49),
  counted_at timestamptz NOT NULL DEFAULT now(),
  streak integer NOT NULL DEFAULT 1,
  UNIQUE (user_id, omer_year, day_number)
);

ALTER TABLE public.omer_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own omer counts"
  ON public.omer_counts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own omer counts"
  ON public.omer_counts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own omer counts"
  ON public.omer_counts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
