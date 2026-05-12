DROP POLICY IF EXISTS "Authenticated users can suggest unverified synagogue profiles" ON public.synagogue_profiles;

CREATE POLICY "Authenticated users can suggest unverified synagogue profiles"
ON public.synagogue_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  president_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND verified = false
  AND length(trim(name)) BETWEEN 1 AND 180
  AND (address IS NULL OR length(address) <= 500)
  AND (latitude IS NULL OR (latitude >= -90 AND latitude <= 90))
  AND (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);

CREATE OR REPLACE FUNCTION public.subscribe_to_place(
  _user_id uuid,
  _place_name text,
  _place_address text DEFAULT NULL::text,
  _place_lat double precision DEFAULT NULL::double precision,
  _place_lng double precision DEFAULT NULL::double precision,
  _google_place_id text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  _syna_id uuid;
  _system_user_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  IF auth.uid() IS NULL OR _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  IF _place_name IS NULL OR length(trim(_place_name)) = 0 OR length(_place_name) > 180 THEN
    RAISE EXCEPTION 'invalid place name';
  END IF;

  SELECT id INTO _syna_id
  FROM public.synagogue_profiles
  WHERE (
    (_place_lat IS NOT NULL AND _place_lng IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL
     AND abs(latitude - _place_lat) < 0.001 AND abs(longitude - _place_lng) < 0.001)
    OR (name = trim(_place_name))
  )
  LIMIT 1;

  IF _syna_id IS NULL THEN
    INSERT INTO public.synagogue_profiles (name, address, latitude, longitude, president_id, verified)
    VALUES (trim(_place_name), nullif(trim(coalesce(_place_address, '')), ''), _place_lat, _place_lng, _system_user_id, false)
    RETURNING id INTO _syna_id;
  END IF;

  INSERT INTO public.synagogue_subscriptions (user_id, synagogue_id)
  VALUES (_user_id, _syna_id)
  ON CONFLICT (user_id, synagogue_id) DO NOTHING;

  RETURN _syna_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.subscribe_to_place(uuid, text, text, double precision, double precision, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.subscribe_to_place(uuid, text, text, double precision, double precision, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.subscribe_to_place(uuid, text, text, double precision, double precision, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.subscribe_to_place(uuid, text, text, double precision, double precision, text) TO service_role;