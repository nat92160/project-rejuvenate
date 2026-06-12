-- 1) Lock identity binding on minyan_registrations INSERT
DROP POLICY IF EXISTS "Anyone can register for minyan with limits" ON public.minyan_registrations;

CREATE POLICY "Anyone can register for minyan with limits"
ON public.minyan_registrations
FOR INSERT
TO public
WITH CHECK (
  guest_count > 0
  AND guest_count <= 5
  AND length(display_name) >= 1
  AND length(display_name) <= 60
  AND (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

-- 2) Revoke EXECUTE from anon/authenticated on internal trigger function
REVOKE EXECUTE ON FUNCTION public.check_comment_rate_limit() FROM PUBLIC, anon, authenticated;
