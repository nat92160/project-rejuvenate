CREATE POLICY "Admin can update any synagogue profile"
ON public.synagogue_profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete any synagogue profile"
ON public.synagogue_profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));