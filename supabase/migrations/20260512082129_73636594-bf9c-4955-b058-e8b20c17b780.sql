-- Revoke EXECUTE on SECURITY DEFINER functions that should not be callable directly by clients.
-- They remain usable inside RLS policies (executed as table owner) and from edge functions (service_role).

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_cerfa_number(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_cerfa_number(uuid) FROM PUBLIC, anon, authenticated;