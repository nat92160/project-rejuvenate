
-- 1) DONATIONS: only service_role (Stripe webhook) can insert
DROP POLICY IF EXISTS "Anyone can insert donations via webhook" ON public.donations;
CREATE POLICY "Service role can insert donations"
  ON public.donations
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2) OMER PUSH SUBSCRIPTIONS: tighten read/delete (insert stays public for browser)
DROP POLICY IF EXISTS "Anyone can delete their own subscription by endpoint" ON public.omer_push_subscriptions;
DROP POLICY IF EXISTS "Anyone can view their own subscription by endpoint" ON public.omer_push_subscriptions;

CREATE POLICY "Service role manages omer push subscriptions"
  ON public.omer_push_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3) Lock down SECURITY DEFINER helpers from public/anon execution.
--    Triggers and SECURITY DEFINER calls keep working (run as definer).
REVOKE EXECUTE ON FUNCTION public.assign_cerfa_number(uuid)              FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.next_cerfa_number(uuid, integer)        FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_campaign_amount()                FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.link_donation_to_user()                 FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.validate_course_type()                  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()              FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                       FROM anon, authenticated, public;
-- has_role is referenced inside RLS — keep authenticated execute, revoke anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)         FROM anon, public;
-- subscribe_to_place is intentionally callable by guests (Guest-first flow)
GRANT  EXECUTE ON FUNCTION public.subscribe_to_place(uuid, text, text, double precision, double precision, text) TO anon, authenticated;
