
-- Subscription table: users follow synagogues
CREATE TABLE public.synagogue_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  synagogue_id uuid NOT NULL REFERENCES public.synagogue_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, synagogue_id)
);

ALTER TABLE public.synagogue_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subscription counts"
  ON public.synagogue_subscriptions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can subscribe"
  ON public.synagogue_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsubscribe"
  ON public.synagogue_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add synagogue_id to content tables so content is linked to a synagogue
ALTER TABLE public.annonces ADD COLUMN synagogue_id uuid REFERENCES public.synagogue_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.cours_zoom ADD COLUMN synagogue_id uuid REFERENCES public.synagogue_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.evenements ADD COLUMN synagogue_id uuid REFERENCES public.synagogue_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.tehilim_chains ADD COLUMN synagogue_id uuid REFERENCES public.synagogue_profiles(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX idx_subscriptions_user ON public.synagogue_subscriptions(user_id);
CREATE INDEX idx_subscriptions_synagogue ON public.synagogue_subscriptions(synagogue_id);
CREATE INDEX idx_annonces_synagogue ON public.annonces(synagogue_id);
CREATE INDEX idx_cours_synagogue ON public.cours_zoom(synagogue_id);
CREATE INDEX idx_evenements_synagogue ON public.evenements(synagogue_id);
CREATE INDEX idx_tehilim_synagogue ON public.tehilim_chains(synagogue_id);
