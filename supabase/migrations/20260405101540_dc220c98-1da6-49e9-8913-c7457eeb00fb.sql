
-- System user ID for auto-created synagogue profiles (Google Maps imports)
-- Using a fixed UUID so we can reference it in RLS

-- Security definer function: subscribe to any place (creates minimal profile if needed)
CREATE OR REPLACE FUNCTION public.subscribe_to_place(
  _user_id uuid,
  _place_name text,
  _place_address text DEFAULT NULL,
  _place_lat double precision DEFAULT NULL,
  _place_lng double precision DEFAULT NULL,
  _google_place_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _syna_id uuid;
  _system_user_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Check if a profile already exists nearby (within ~100m) or by google place name match
  SELECT id INTO _syna_id
  FROM synagogue_profiles
  WHERE (
    (_place_lat IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL
     AND abs(latitude - _place_lat) < 0.001 AND abs(longitude - _place_lng) < 0.001)
    OR (name = _place_name AND _place_name IS NOT NULL AND _place_name != '')
  )
  LIMIT 1;

  -- If not found, create a minimal profile
  IF _syna_id IS NULL THEN
    INSERT INTO synagogue_profiles (name, address, latitude, longitude, president_id, verified)
    VALUES (_place_name, _place_address, _place_lat, _place_lng, _system_user_id, false)
    RETURNING id INTO _syna_id;
  END IF;

  -- Upsert subscription
  INSERT INTO synagogue_subscriptions (user_id, synagogue_id)
  VALUES (_user_id, _syna_id)
  ON CONFLICT (user_id, synagogue_id) DO NOTHING;

  RETURN _syna_id;
END;
$$;
