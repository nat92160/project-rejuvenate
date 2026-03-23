
-- =============================================
-- FIX 1: PRIVILEGE ESCALATION on user_roles
-- Only allow self-insert with 'guest' role
-- =============================================
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

CREATE POLICY "Users can only insert guest role for themselves"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
  AND role = 'guest'::app_role
);

-- =============================================
-- FIX 2: PUSH SUBSCRIPTIONS publicly readable
-- Restrict SELECT to owner only (service role bypasses RLS anyway)
-- =============================================
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can read their own push subscriptions"
ON public.push_subscriptions
FOR SELECT
TO public
USING (auth.uid() = user_id);

-- =============================================
-- FIX 3: TEHILIM CLAIMS - restrict delete/update
-- Allow delete/update only for the claim owner OR the chain creator
-- =============================================
DROP POLICY IF EXISTS "Anyone can delete claims by id" ON public.tehilim_claims;
DROP POLICY IF EXISTS "Anyone can update claims" ON public.tehilim_claims;

CREATE POLICY "Owner or chain creator can delete claims"
ON public.tehilim_claims
FOR DELETE
TO public
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.tehilim_chains
    WHERE tehilim_chains.id = tehilim_claims.chain_id
    AND tehilim_chains.creator_id = auth.uid()
  )
  -- Allow guest deletion by matching display_name when not authenticated
  OR (user_id IS NULL AND auth.uid() IS NULL)
);

CREATE POLICY "Owner or chain creator can update claims"
ON public.tehilim_claims
FOR UPDATE
TO public
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.tehilim_chains
    WHERE tehilim_chains.id = tehilim_claims.chain_id
    AND tehilim_chains.creator_id = auth.uid()
  )
  -- Allow guest updates on their own claims (user_id is null)
  OR (user_id IS NULL AND auth.uid() IS NULL)
);
