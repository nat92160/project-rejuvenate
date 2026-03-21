
-- Allow adjoint to update synagogue profiles
DROP POLICY IF EXISTS "President can update their profile" ON public.synagogue_profiles;
CREATE POLICY "President or adjoint can update profile" ON public.synagogue_profiles
  FOR UPDATE TO public
  USING (
    (auth.uid() = president_id AND has_role(auth.uid(), 'president'::app_role))
    OR (auth.uid() = adjoint_id AND has_role(auth.uid(), 'president'::app_role))
  );

-- Update insert policies for content tables to also allow adjoint
-- For annonces
DROP POLICY IF EXISTS "Presidents can create annonces" ON public.annonces;
CREATE POLICY "Presidents can create annonces" ON public.annonces
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND (
      has_role(auth.uid(), 'president'::app_role)
      OR EXISTS (SELECT 1 FROM synagogue_profiles WHERE adjoint_id = auth.uid())
    )
  );

-- For cours_zoom
DROP POLICY IF EXISTS "Presidents can create cours" ON public.cours_zoom;
CREATE POLICY "Presidents can create cours" ON public.cours_zoom
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND (
      has_role(auth.uid(), 'president'::app_role)
      OR EXISTS (SELECT 1 FROM synagogue_profiles WHERE adjoint_id = auth.uid())
    )
  );

-- For evenements
DROP POLICY IF EXISTS "Presidents can create evenements" ON public.evenements;
CREATE POLICY "Presidents can create evenements" ON public.evenements
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND (
      has_role(auth.uid(), 'president'::app_role)
      OR EXISTS (SELECT 1 FROM synagogue_profiles WHERE adjoint_id = auth.uid())
    )
  );

-- For minyan_sessions
DROP POLICY IF EXISTS "Presidents can create sessions" ON public.minyan_sessions;
CREATE POLICY "Presidents can create sessions" ON public.minyan_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND (
      has_role(auth.uid(), 'president'::app_role)
      OR EXISTS (SELECT 1 FROM synagogue_profiles WHERE adjoint_id = auth.uid())
    )
  );

-- For tehilim_chains
DROP POLICY IF EXISTS "Presidents can create chains" ON public.tehilim_chains;
CREATE POLICY "Presidents can create chains" ON public.tehilim_chains
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND (
      has_role(auth.uid(), 'president'::app_role)
      OR EXISTS (SELECT 1 FROM synagogue_profiles WHERE adjoint_id = auth.uid())
    )
  );
