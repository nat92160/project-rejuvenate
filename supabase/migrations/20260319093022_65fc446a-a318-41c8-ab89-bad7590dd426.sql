
-- Allow unauthenticated users to insert into tehilim_claims (guest access)
DROP POLICY IF EXISTS "Authenticated users can claim" ON public.tehilim_claims;
CREATE POLICY "Anyone can claim psalms"
  ON public.tehilim_claims
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow unauthenticated users to delete their own claims (by id)
DROP POLICY IF EXISTS "Users or chain creator can delete claims" ON public.tehilim_claims;
CREATE POLICY "Anyone can delete claims by id"
  ON public.tehilim_claims
  FOR DELETE
  TO public
  USING (true);

-- Allow unauthenticated users to update claims (mark complete)
DROP POLICY IF EXISTS "Users can update own claims" ON public.tehilim_claims;
CREATE POLICY "Anyone can update claims"
  ON public.tehilim_claims
  FOR UPDATE
  TO public
  USING (true);

-- Allow unauthenticated inserts for minyan registrations
DROP POLICY IF EXISTS "Authenticated users can register" ON public.minyan_registrations;
CREATE POLICY "Anyone can register for minyan"
  ON public.minyan_registrations
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow unauthenticated deletes for minyan registrations
DROP POLICY IF EXISTS "Users can remove own registration" ON public.minyan_registrations;
CREATE POLICY "Anyone can remove registration"
  ON public.minyan_registrations
  FOR DELETE
  TO public
  USING (true);
