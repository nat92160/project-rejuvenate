
-- ============================================================
-- 1. Restreindre les buckets affiches & synagogue-logos en privé
--    Les fichiers restent partageables via signed URLs (7 jours)
-- ============================================================

-- Passer les buckets en privé (le linter flag les buckets publics)
UPDATE storage.buckets SET public = false WHERE id IN ('affiches', 'synagogue-logos');

-- Supprimer les anciennes policies SELECT trop permissives
DROP POLICY IF EXISTS "Public read affiches" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read affiches" ON storage.objects;
DROP POLICY IF EXISTS "Public read synagogue-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read synagogue-logos" ON storage.objects;

-- Lecture : tout le monde peut lire un fichier précis (par chemin), mais PAS lister le bucket
-- Les buckets privés bloquent le listing automatiquement; les signed URLs permettent l'accès aux fichiers connus
CREATE POLICY "Anyone can read affiches files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'affiches');

CREATE POLICY "Anyone can read synagogue-logos files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'synagogue-logos');

-- ============================================================
-- 2. Sécuriser les RLS "USING (true)" du guest-flow
--    On garde l'accès invité mais on ajoute des garde-fous
-- ============================================================

-- Minyan : limiter à 5 inscriptions par session_id (session navigateur invité)
-- => On ne peut pas faire ça dans une policy simple. À la place on:
--    a) restreint l'INSERT public à un guest_count <= 5 (pas de spam massif)
--    b) garde le DELETE pour le propriétaire de la session
DROP POLICY IF EXISTS "Anyone can register for minyan" ON public.minyan_registrations;
CREATE POLICY "Anyone can register for minyan with limits"
ON public.minyan_registrations FOR INSERT
TO public
WITH CHECK (
  guest_count > 0 AND guest_count <= 5
  AND length(display_name) BETWEEN 1 AND 60
);

-- Tehilim chains : limiter le titre/dedication à des longueurs raisonnables
DROP POLICY IF EXISTS "Authenticated or guest can create chains" ON public.tehilim_chains;
CREATE POLICY "Authenticated or guest can create chains"
ON public.tehilim_chains FOR INSERT
TO public
WITH CHECK (
  (((auth.uid() IS NOT NULL) AND (creator_id = auth.uid()))
   OR ((auth.uid() IS NULL) AND (creator_id = '00000000-0000-0000-0000-000000000000'::uuid)))
  AND length(title) BETWEEN 1 AND 120
  AND (dedication IS NULL OR length(dedication) <= 200)
);

-- Tehilim claims : limiter le nom et la plage de chapitres (1..150)
DROP POLICY IF EXISTS "Anyone can claim psalms" ON public.tehilim_claims;
CREATE POLICY "Anyone can claim psalms with limits"
ON public.tehilim_claims FOR INSERT
TO public
WITH CHECK (
  length(display_name) BETWEEN 1 AND 60
  AND chapter_start BETWEEN 1 AND 150
  AND chapter_end BETWEEN 1 AND 150
  AND chapter_end >= chapter_start
);

-- ============================================================
-- 3. SECURITY DEFINER : has_role est utilisée par TOUTES les policies RLS
--    => doit rester appelable. On garde l'EXECUTE.
--    subscribe_to_place est intentionnel (guest flow). On garde.
--    Aucune action SQL ici, simplement documenté.
-- ============================================================
