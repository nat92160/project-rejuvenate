-- Allow admins to delete and update any donation
CREATE POLICY "Admins can delete donations"
ON public.donations
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update donations"
ON public.donations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));