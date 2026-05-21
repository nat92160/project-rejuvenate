DROP INDEX IF EXISTS public.refoua_actions_unique_prayed;

CREATE UNIQUE INDEX refoua_actions_unique_prayed_authenticated
  ON public.refoua_actions (refoua_id, user_id, action_date)
  WHERE action_type = 'prayed'
    AND user_id <> '00000000-0000-0000-0000-000000000000'::uuid;