CREATE POLICY "Authenticated users can attach synagogues"
ON public.refoua_chelema
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);