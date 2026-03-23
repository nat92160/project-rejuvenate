
-- =============================================
-- FIX 4: SYNAGOGUE SUBSCRIPTIONS - restrict SELECT
-- Only owner + synagogue president can see subscriptions
-- =============================================
DROP POLICY IF EXISTS "Anyone can view subscription counts" ON public.synagogue_subscriptions;

-- Authenticated users can see their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.synagogue_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Presidents can see subscribers of their synagogue
CREATE POLICY "Presidents can view their synagogue subscriptions"
ON public.synagogue_subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.synagogue_profiles
    WHERE synagogue_profiles.id = synagogue_subscriptions.synagogue_id
    AND (synagogue_profiles.president_id = auth.uid() OR synagogue_profiles.adjoint_id = auth.uid())
  )
);

-- Admins can see all
CREATE POLICY "Admins can view all subscriptions"
ON public.synagogue_subscriptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- FIX 5: TEHILIM CHAINS - restrict INSERT
-- Anyone can create but must provide a valid creator_id
-- =============================================
DROP POLICY IF EXISTS "Anyone can create chains" ON public.tehilim_chains;

CREATE POLICY "Authenticated or guest can create chains"
ON public.tehilim_chains
FOR INSERT
TO public
WITH CHECK (
  -- Authenticated users must set their own creator_id
  (auth.uid() IS NOT NULL AND creator_id = auth.uid())
  -- Guests use the nil UUID
  OR (auth.uid() IS NULL AND creator_id = '00000000-0000-0000-0000-000000000000'::uuid)
);

-- =============================================
-- FIX 6: SHABBAT PUSH LOG - restrict to admins
-- =============================================
CREATE POLICY "Only admins can view push log"
ON public.shabbat_push_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert push log"
ON public.shabbat_push_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- FIX 7: MINYAN REGISTRATIONS - restrict delete to owner
-- =============================================
DROP POLICY IF EXISTS "Anyone can remove registration" ON public.minyan_registrations;

CREATE POLICY "Users can remove their own registration"
ON public.minyan_registrations
FOR DELETE
TO public
USING (
  user_id = auth.uid()
  -- Allow guest deletion for anonymous users
  OR (user_id = '00000000-0000-0000-0000-000000000000'::uuid AND auth.uid() IS NULL)
);
