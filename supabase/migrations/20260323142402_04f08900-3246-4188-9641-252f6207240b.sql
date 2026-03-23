
-- Drop the restrictive president-only insert policy
DROP POLICY IF EXISTS "Presidents can create chains" ON public.tehilim_chains;

-- Allow anyone (including anonymous/guest) to create chains
CREATE POLICY "Anyone can create chains"
ON public.tehilim_chains
FOR INSERT
TO public
WITH CHECK (true);
