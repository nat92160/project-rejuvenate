
CREATE TABLE public.hazkara_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deceased_name text NOT NULL,
  observance_date date NOT NULL,
  hebrew_label text,
  sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hazkara_reminders_obs_idx ON public.hazkara_reminders (observance_date) WHERE sent = false;
CREATE INDEX hazkara_reminders_user_idx ON public.hazkara_reminders (user_id);

ALTER TABLE public.hazkara_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their hazkara reminders"
  ON public.hazkara_reminders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
