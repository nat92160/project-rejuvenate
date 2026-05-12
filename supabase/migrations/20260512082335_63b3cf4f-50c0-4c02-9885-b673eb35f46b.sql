-- 1) Vue : repasser en security_invoker
ALTER VIEW public.synagogue_donation_slugs SET (security_invoker = true);

-- Restaurer une policy SELECT publique limitée colonne par GRANT
CREATE POLICY "Public can read donation slug only"
ON public.synagogue_stripe_accounts
FOR SELECT
USING (true);

-- Permissions colonnes pour anon/authenticated (pas de stripe_account_id)
GRANT SELECT (synagogue_id, custom_donation_slug, is_onboarded)
  ON public.synagogue_stripe_accounts TO anon, authenticated;

-- 2) Revoke EXECUTE sur fonctions internes (déclencheurs uniquement)
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_course_type() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_campaign_amount() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_donation_to_user() FROM PUBLIC, anon, authenticated;