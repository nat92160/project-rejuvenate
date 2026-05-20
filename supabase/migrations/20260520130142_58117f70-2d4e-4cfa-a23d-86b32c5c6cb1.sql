REVOKE EXECUTE ON FUNCTION public.get_synagogue_subscribers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_synagogue_subscribers(uuid) TO authenticated;