CREATE OR REPLACE FUNCTION public.get_synagogue_subscribers(_synagogue_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  first_name text,
  last_name text,
  subscribed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.user_id,
    p.display_name,
    p.first_name,
    p.last_name,
    s.created_at AS subscribed_at
  FROM public.synagogue_subscriptions s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  WHERE s.synagogue_id = _synagogue_id
    AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.synagogue_profiles sp
        WHERE sp.id = _synagogue_id
          AND (sp.president_id = auth.uid() OR sp.adjoint_id = auth.uid())
      )
    )
  ORDER BY s.created_at DESC;
$$;