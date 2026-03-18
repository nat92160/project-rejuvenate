
-- Chaînes de Tehilim créées par les présidents
CREATE TABLE public.tehilim_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Chaîne de Tehilim',
  dedication text,
  dedication_type text DEFAULT 'general',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.tehilim_chains ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les chaînes actives
CREATE POLICY "Anyone can view active chains"
ON public.tehilim_chains FOR SELECT
TO public
USING (true);

-- Seuls les présidents peuvent créer des chaînes
CREATE POLICY "Presidents can create chains"
ON public.tehilim_chains FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'president') AND auth.uid() = creator_id);

-- Seul le créateur peut modifier sa chaîne
CREATE POLICY "Creator can update own chain"
ON public.tehilim_chains FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id);

-- Seul le créateur peut supprimer sa chaîne
CREATE POLICY "Creator can delete own chain"
ON public.tehilim_chains FOR DELETE
TO authenticated
USING (auth.uid() = creator_id);

-- Claims : qui a pris quel chapitre
CREATE TABLE public.tehilim_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id uuid NOT NULL REFERENCES public.tehilim_chains(id) ON DELETE CASCADE,
  user_id uuid,
  display_name text NOT NULL,
  chapter_start int NOT NULL,
  chapter_end int NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.tehilim_claims ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les claims
CREATE POLICY "Anyone can view claims"
ON public.tehilim_claims FOR SELECT
TO public
USING (true);

-- Les utilisateurs connectés peuvent réserver des chapitres
CREATE POLICY "Authenticated users can claim"
ON public.tehilim_claims FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- L'utilisateur peut mettre à jour son propre claim (marquer comme complété)
CREATE POLICY "Users can update own claims"
ON public.tehilim_claims FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- L'utilisateur ou le créateur de la chaîne peut supprimer un claim
CREATE POLICY "Users or chain creator can delete claims"
ON public.tehilim_claims FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.tehilim_chains 
    WHERE id = chain_id AND creator_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tehilim_claims;
