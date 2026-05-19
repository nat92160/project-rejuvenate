
ALTER TABLE public.synagogue_profiles
  ADD COLUMN IF NOT EXISTS mikve_reservation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mikve_slot_duration_min integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS mikve_slot_capacity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS mikve_open_days integer[] NOT NULL DEFAULT ARRAY[0,1,2,3,4]::integer[],
  ADD COLUMN IF NOT EXISTS mikve_open_start time NOT NULL DEFAULT '19:00'::time,
  ADD COLUMN IF NOT EXISTS mikve_open_end time NOT NULL DEFAULT '22:00'::time;

CREATE TABLE IF NOT EXISTS public.mikve_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synagogue_id uuid NOT NULL,
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mikve_res_syna_date ON public.mikve_reservations(synagogue_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_mikve_res_user ON public.mikve_reservations(user_id);

ALTER TABLE public.mikve_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own mikve reservations"
  ON public.mikve_reservations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "President sees synagogue mikve reservations"
  ON public.mikve_reservations FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.synagogue_profiles sp
    WHERE sp.id = mikve_reservations.synagogue_id
      AND (sp.president_id = auth.uid() OR sp.adjoint_id = auth.uid())
  ));

CREATE POLICY "Users create own mikve reservation"
  ON public.mikve_reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User or president can delete mikve reservation"
  ON public.mikve_reservations FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.synagogue_profiles sp
      WHERE sp.id = mikve_reservations.synagogue_id
        AND (sp.president_id = auth.uid() OR sp.adjoint_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.get_mikve_availability(_synagogue_id uuid, _from date, _to date)
RETURNS TABLE(slot_date date, slot_time time, booked_count bigint)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT slot_date, slot_time, count(*)::bigint
  FROM public.mikve_reservations
  WHERE synagogue_id = _synagogue_id
    AND slot_date BETWEEN _from AND _to
  GROUP BY slot_date, slot_time;
$$;
