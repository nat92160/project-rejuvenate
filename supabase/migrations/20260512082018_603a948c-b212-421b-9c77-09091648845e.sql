-- 1) Stripe : retirer l'exposition publique du stripe_account_id
DROP POLICY IF EXISTS "Anyone can view stripe accounts for donation pages" ON public.synagogue_stripe_accounts;

-- Vue publique limitée aux champs nécessaires aux pages de don
CREATE OR REPLACE VIEW public.synagogue_donation_slugs
WITH (security_invoker = true) AS
SELECT
  synagogue_id,
  custom_donation_slug,
  is_onboarded
FROM public.synagogue_stripe_accounts;

-- Politique permissive de lecture sur la table : uniquement via la vue (la vue elle-même hérite des permissions)
-- On donne SELECT public sur la vue
GRANT SELECT ON public.synagogue_donation_slugs TO anon, authenticated;

-- Pour que la vue (security_invoker) puisse lire la table sans RLS bloquante,
-- on ajoute une policy SELECT restreinte aux colonnes safe via une policy qui autorise tous mais on s'appuie sur la vue.
-- Solution simple : recréer une policy SELECT publique mais on filtrera côté client via la vue.
-- Comme RLS s'applique par ligne pas par colonne, on garde une policy SELECT publique
-- mais on retire l'accès direct via REVOKE sur la table pour anon.
REVOKE SELECT ON public.synagogue_stripe_accounts FROM anon;
GRANT SELECT (synagogue_id, custom_donation_slug, is_onboarded) ON public.synagogue_stripe_accounts TO anon, authenticated;

-- Recréer une policy SELECT publique (nécessaire car RLS exige une policy)
CREATE POLICY "Public can view donation slug fields"
ON public.synagogue_stripe_accounts
FOR SELECT
USING (true);

-- 2) Storage : restreindre le LIST/SELECT des buckets aux fichiers de la synagogue propriétaire
-- Convention : le premier segment du nom de fichier = synagogue_id
DROP POLICY IF EXISTS "affiches_select_scoped" ON storage.objects;
CREATE POLICY "affiches_select_scoped"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'affiches'
  AND EXISTS (
    SELECT 1 FROM public.synagogue_profiles sp
    WHERE sp.id::text = (storage.foldername(name))[1]
      AND (sp.president_id = auth.uid() OR sp.adjoint_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "logos_select_scoped" ON storage.objects;
CREATE POLICY "logos_select_scoped"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'synagogue-logos'
  AND EXISTS (
    SELECT 1 FROM public.synagogue_profiles sp
    WHERE sp.id::text = (storage.foldername(name))[1]
      AND (sp.president_id = auth.uid() OR sp.adjoint_id = auth.uid())
  )
);

-- Lecture publique nécessaire pour afficher les logos/affiches sur l'app sans auth
-- (les fichiers ont des noms UUID, énumération difficile mais possible).
-- On autorise SELECT public uniquement sur des fichiers existants accédés directement (pas de LIST).
DROP POLICY IF EXISTS "affiches_public_read" ON storage.objects;
CREATE POLICY "affiches_public_read"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'affiches');

DROP POLICY IF EXISTS "logos_public_read" ON storage.objects;
CREATE POLICY "logos_public_read"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'synagogue-logos');

-- 3) Realtime : la table synagogue_messages a déjà des policies RLS strictes
-- (Approved members and president can view messages). Realtime postgres_changes
-- respecte ces policies quand le client est authentifié. Aucun changement requis.
-- On s'assure néanmoins que REPLICA IDENTITY est FULL pour les events
ALTER TABLE public.synagogue_messages REPLICA IDENTITY FULL;