CREATE POLICY "Admin can create synagogue profiles"
ON public.synagogue_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));