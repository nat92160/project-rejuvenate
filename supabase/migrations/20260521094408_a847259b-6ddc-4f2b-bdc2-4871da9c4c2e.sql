CREATE OR REPLACE FUNCTION public.approve_prayer_time_suggestion(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _sugg record;
  _col text;
  _normalized time;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO _sugg FROM public.prayer_time_suggestions WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'suggestion not found'; END IF;

  IF NOT (
    private.has_role(_caller, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.synagogue_profiles
      WHERE id = _sugg.synagogue_id
        AND (president_id = _caller OR adjoint_id = _caller)
    )
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.prayer_time_suggestions
     SET status = 'approved', verified = true,
         reviewed_by = _caller, reviewed_at = now(), updated_at = now()
   WHERE id = _id;

  IF _sugg.synagogue_id IS NOT NULL AND _sugg.time_value IS NOT NULL THEN
    _col := CASE _sugg.office_name
      WHEN 'shacharit' THEN 'shacharit_time'
      WHEN 'minha' THEN 'minha_time'
      WHEN 'arvit' THEN 'arvit_time'
      ELSE NULL END;
    IF _col IS NOT NULL THEN
      _normalized := _sugg.time_value::time;
      EXECUTE format('UPDATE public.synagogue_profiles SET %I = $1, updated_at = now() WHERE id = $2', _col)
        USING _normalized, _sugg.synagogue_id;
    END IF;
  END IF;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (office_name) office_name, time_value, synagogue_id
    FROM public.prayer_time_suggestions
    WHERE synagogue_id = 'f3d08156-b7ef-4763-b90d-d5122465bad8'
      AND status = 'approved' AND time_value IS NOT NULL
    ORDER BY office_name, reviewed_at DESC
  LOOP
    EXECUTE format('UPDATE public.synagogue_profiles SET %I = $1, updated_at = now() WHERE id = $2',
      CASE r.office_name WHEN 'shacharit' THEN 'shacharit_time' WHEN 'minha' THEN 'minha_time' WHEN 'arvit' THEN 'arvit_time' END)
      USING r.time_value::time, r.synagogue_id;
  END LOOP;
END $$;