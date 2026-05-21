
DROP POLICY IF EXISTS "Authenticated users can create their refoua actions" ON public.refoua_actions;

CREATE POLICY "Anyone can create refoua actions"
ON public.refoua_actions
FOR INSERT
TO public
WITH CHECK (
  length(display_name) >= 1
  AND length(display_name) <= 60
  AND (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);
