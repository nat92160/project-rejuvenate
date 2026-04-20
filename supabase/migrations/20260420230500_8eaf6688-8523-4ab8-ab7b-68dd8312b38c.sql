-- Permettre au président (ou son adjoint) de modifier sa fiche synagogue
-- Problème actuel : la policy UPDATE n'a pas de WITH CHECK, ce qui peut bloquer la mise à jour
-- Et la condition exige has_role('president'), bloquant les présidents nouvellement créés ou multi-syna

DROP POLICY IF EXISTS "President or adjoint can update profile" ON public.synagogue_profiles;

CREATE POLICY "President or adjoint can update profile"
ON public.synagogue_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = president_id
  OR auth.uid() = adjoint_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = president_id
  OR auth.uid() = adjoint_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);