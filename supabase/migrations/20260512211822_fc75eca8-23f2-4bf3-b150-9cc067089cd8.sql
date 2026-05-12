
-- 1) Restrict synagogue_stripe_accounts: drop public SELECT (use synagogue_donation_slugs view)
DROP POLICY IF EXISTS "Public can read donation slug only" ON public.synagogue_stripe_accounts;
GRANT SELECT ON public.synagogue_donation_slugs TO anon, authenticated;

-- 2) Revoke truly sensitive synagogue_profiles columns from anon (keep what donation page needs)
REVOKE SELECT (signature, signature_image_url) ON public.synagogue_profiles FROM anon;

-- 3) Tighten prayer_time_suggestions: remove guest-pending public exposure of display_name
DROP POLICY IF EXISTS "View suggestions based on role" ON public.prayer_time_suggestions;
CREATE POLICY "View suggestions based on role"
ON public.prayer_time_suggestions
FOR SELECT
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (EXISTS (
    SELECT 1 FROM synagogue_profiles
    WHERE synagogue_profiles.id = prayer_time_suggestions.synagogue_id
      AND (synagogue_profiles.president_id = auth.uid() OR synagogue_profiles.adjoint_id = auth.uid())
  ))
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR (status = 'approved'::text)
);

-- 4) Revoke EXECUTE on SECURITY DEFINER helpers from anon/authenticated where unnecessary.
--    Triggers and edge-function (service_role) callers don't need EXECUTE rights for anon/auth.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_campaign_amount() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_donation_to_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_support_thread() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_account_backups() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_cerfa_number(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_cerfa_number(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_course_type() FROM PUBLIC, anon, authenticated;
-- subscribe_to_place is called by authenticated users from the client, keep their EXECUTE
REVOKE EXECUTE ON FUNCTION public.subscribe_to_place(uuid, text, text, double precision, double precision, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_to_place(uuid, text, text, double precision, double precision, text) TO authenticated;
