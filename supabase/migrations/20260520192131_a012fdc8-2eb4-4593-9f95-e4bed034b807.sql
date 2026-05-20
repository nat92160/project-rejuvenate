-- Transfer presidency from caller (current president) to another user.
CREATE OR REPLACE FUNCTION public.transfer_synagogue_presidency(
  _synagogue_id uuid,
  _new_president_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_president uuid;
  _caller uuid := auth.uid();
  _still_president boolean;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _new_president_id IS NULL OR _new_president_id = '00000000-0000-0000-0000-000000000001'::uuid THEN
    RAISE EXCEPTION 'invalid new president';
  END IF;

  SELECT president_id INTO _current_president
  FROM public.synagogue_profiles
  WHERE id = _synagogue_id;

  IF _current_president IS NULL THEN
    RAISE EXCEPTION 'synagogue not found';
  END IF;

  IF _caller <> _current_president AND NOT private.has_role(_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'only the current president can transfer';
  END IF;

  IF _caller = _new_president_id THEN
    RAISE EXCEPTION 'already president';
  END IF;

  -- Reassign synagogue ownership; remove the new president from adjoint slot if they were
  UPDATE public.synagogue_profiles
     SET president_id = _new_president_id,
         adjoint_id = CASE WHEN adjoint_id = _new_president_id THEN NULL ELSE adjoint_id END
   WHERE id = _synagogue_id;

  -- Grant president role to the new president
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_new_president_id, 'president'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Demote previous president to fidele if they no longer preside any synagogue
  SELECT EXISTS (
    SELECT 1 FROM public.synagogue_profiles
    WHERE president_id = _current_president OR adjoint_id = _current_president
  ) INTO _still_president;

  IF NOT _still_president THEN
    DELETE FROM public.user_roles
     WHERE user_id = _current_president AND role = 'president'::app_role;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_current_president, 'fidele'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- Step down: caller releases a synagogue they preside.
CREATE OR REPLACE FUNCTION public.step_down_from_synagogue(
  _synagogue_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_president uuid;
  _caller uuid := auth.uid();
  _system uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  _still_president boolean;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT president_id INTO _current_president
  FROM public.synagogue_profiles
  WHERE id = _synagogue_id;

  IF _current_president IS NULL THEN
    RAISE EXCEPTION 'synagogue not found';
  END IF;

  IF _caller <> _current_president AND NOT private.has_role(_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'only the current president can step down';
  END IF;

  UPDATE public.synagogue_profiles
     SET president_id = _system,
         adjoint_id = CASE WHEN adjoint_id = _caller THEN NULL ELSE adjoint_id END
   WHERE id = _synagogue_id;

  -- Demote caller to fidele if they no longer preside / assist any synagogue
  SELECT EXISTS (
    SELECT 1 FROM public.synagogue_profiles
    WHERE president_id = _caller OR adjoint_id = _caller
  ) INTO _still_president;

  IF NOT _still_president THEN
    DELETE FROM public.user_roles
     WHERE user_id = _caller AND role = 'president'::app_role;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_caller, 'fidele'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_synagogue_presidency(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.step_down_from_synagogue(uuid) TO authenticated;