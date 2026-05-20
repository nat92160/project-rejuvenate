CREATE OR REPLACE FUNCTION public.request_synagogue_presidency(
  _name text,
  _address text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL,
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL,
  _shacharit_time time DEFAULT NULL,
  _minha_time time DEFAULT NULL,
  _arvit_time time DEFAULT NULL,
  _signature text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _syna_id uuid;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _name IS NULL OR length(trim(_name)) = 0 OR length(_name) > 180 THEN
    RAISE EXCEPTION 'invalid name';
  END IF;

  INSERT INTO public.synagogue_profiles (
    name, address, phone, email, latitude, longitude,
    shacharit_time, minha_time, arvit_time, signature,
    president_id, verified
  )
  VALUES (
    trim(_name), nullif(trim(coalesce(_address,'')),''), nullif(trim(coalesce(_phone,'')),''),
    nullif(trim(coalesce(_email,'')),''), _latitude, _longitude,
    _shacharit_time, _minha_time, _arvit_time, coalesce(_signature,''),
    _caller, false
  )
  RETURNING id INTO _syna_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_caller, 'president'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _syna_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_synagogue_presidency(text,text,text,text,double precision,double precision,time,time,time,text) TO authenticated;