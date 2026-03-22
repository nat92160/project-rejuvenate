-- Table for personal commemorative dates (Azkarot, Hachkaba, Anniversaires, etc.)
CREATE TABLE public.personal_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date_type text NOT NULL DEFAULT 'azkarot',
  hebrew_name text NOT NULL DEFAULT '',
  civil_date date,
  hebrew_date_day int,
  hebrew_date_month text,
  hebrew_date_year int,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dates" ON public.personal_dates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own dates" ON public.personal_dates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own dates" ON public.personal_dates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own dates" ON public.personal_dates FOR DELETE USING (auth.uid() = user_id);