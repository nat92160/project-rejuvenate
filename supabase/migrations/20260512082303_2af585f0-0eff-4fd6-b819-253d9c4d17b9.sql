-- ============================================
-- 1) synagogue_profiles : masquer colonnes sensibles aux visiteurs anonymes
-- ============================================
-- Anon ne pourra plus lire : president_first_name, president_last_name, siret_number,
-- rna_number, association_legal_name, association_object, signature, signature_image_url,
-- adjoint_id, president_id, cerfa_counter_value, cerfa_counter_year, donation_link
-- Anon garde l'accès aux infos de l'annuaire public (name, address, phone, email, horaires...)
REVOKE SELECT ON public.synagogue_profiles FROM anon;
GRANT SELECT (
  id, name, address, phone, email, latitude, longitude, verified,
  shacharit_time, shacharit_time_2, minha_time, minha_time_2, arvit_time, arvit_time_2,
  mikve_enabled, mikve_summer_hours, mikve_winter_hours, mikve_phone, mikve_maps_link,
  speakers, chat_enabled, logo_url, primary_color, secondary_color, font_family,
  donation_slug, article_cgi, organism_quality,
  created_at, updated_at
) ON public.synagogue_profiles TO anon;

-- ============================================
-- 2) synagogue_stripe_accounts : retirer toute lecture directe
-- ============================================
DROP POLICY IF EXISTS "Public can view donation slug fields" ON public.synagogue_stripe_accounts;
-- La vue publique reste disponible (security_invoker à false pour bypass RLS sur cette vue contrôlée)
ALTER VIEW public.synagogue_donation_slugs SET (security_invoker = false);

-- ============================================
-- 3) Storage : retirer les policies de listage trop larges
-- ============================================
DROP POLICY IF EXISTS "Authenticated can list affiches" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can list logos" ON storage.objects;

-- ============================================
-- 4) tehilim_claims : empêcher les invités d'altérer les claims d'autres invités
-- ============================================
DROP POLICY IF EXISTS "Owner or chain creator can delete claims" ON public.tehilim_claims;
CREATE POLICY "Owner or chain creator can delete claims"
ON public.tehilim_claims FOR DELETE
USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.tehilim_chains
    WHERE tehilim_chains.id = tehilim_claims.chain_id
      AND tehilim_chains.creator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owner or chain creator can update claims" ON public.tehilim_claims;
CREATE POLICY "Owner or chain creator can update claims"
ON public.tehilim_claims FOR UPDATE
USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.tehilim_chains
    WHERE tehilim_chains.id = tehilim_claims.chain_id
      AND tehilim_chains.creator_id = auth.uid()
  )
);

-- ============================================
-- 5) prayer_time_suggestions : ajouter garde-fou minimal
-- ============================================
DROP POLICY IF EXISTS "Anyone can create suggestions" ON public.prayer_time_suggestions;
CREATE POLICY "Anyone can create suggestions"
ON public.prayer_time_suggestions FOR INSERT
WITH CHECK (
  length(office_name) BETWEEN 1 AND 60
  AND length(display_name) <= 80
  AND (time_value IS NULL OR length(time_value) <= 20)
);

-- ============================================
-- 6) omer_push_subscriptions : ajouter garde-fou minimal
-- ============================================
DROP POLICY IF EXISTS "Anyone can subscribe to omer push" ON public.omer_push_subscriptions;
CREATE POLICY "Anyone can subscribe to omer push"
ON public.omer_push_subscriptions FOR INSERT
WITH CHECK (
  length(endpoint) BETWEEN 10 AND 2048
  AND length(p256dh) BETWEEN 10 AND 200
  AND length(auth) BETWEEN 10 AND 100
);