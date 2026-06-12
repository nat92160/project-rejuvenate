
-- 1. Refoua chelema: restrict UPDATE to creator / admin / president
DROP POLICY IF EXISTS "Authenticated users can attach synagogues" ON public.refoua_chelema;
CREATE POLICY "Creator or admin can update refoua entry"
ON public.refoua_chelema
FOR UPDATE
TO authenticated
USING (
  auth.uid() = added_by
  OR private.has_role(auth.uid(), 'admin'::app_role)
  OR private.has_role(auth.uid(), 'president'::app_role)
)
WITH CHECK (
  auth.uid() = added_by
  OR private.has_role(auth.uid(), 'admin'::app_role)
  OR private.has_role(auth.uid(), 'president'::app_role)
);

-- 2. cours_zoom: restrict SELECT to authenticated users (zoom_link may contain passwords)
DROP POLICY IF EXISTS "Anyone can view cours" ON public.cours_zoom;
CREATE POLICY "Authenticated can view cours"
ON public.cours_zoom
FOR SELECT
TO authenticated
USING (true);
REVOKE SELECT ON public.cours_zoom FROM anon;

-- 3. Revoke EXECUTE from anon on SECURITY DEFINER functions that should not be public
REVOKE EXECUTE ON FUNCTION public.approve_prayer_time_suggestion(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_mikve_availability(uuid, date, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.request_synagogue_presidency(text, text, text, text, double precision, double precision, time, time, time, text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.approve_prayer_time_suggestion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mikve_availability(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_synagogue_presidency(text, text, text, text, double precision, double precision, time, time, time, text) TO authenticated;
