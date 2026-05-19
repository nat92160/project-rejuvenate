-- Programme de prière pour un malade
CREATE TABLE public.refoua_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  refoua_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  prayer_type text NOT NULL DEFAULT 'tehilim_full',
  days_count integer NOT NULL DEFAULT 7,
  slots_per_day integer NOT NULL DEFAULT 10,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT refoua_campaigns_days_check CHECK (days_count BETWEEN 1 AND 60),
  CONSTRAINT refoua_campaigns_slots_check CHECK (slots_per_day BETWEEN 1 AND 50)
);

ALTER TABLE public.refoua_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view campaigns"
  ON public.refoua_campaigns FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create campaigns"
  ON public.refoua_campaigns FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can delete campaigns"
  ON public.refoua_campaigns FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can update campaigns"
  ON public.refoua_campaigns FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE INDEX idx_refoua_campaigns_refoua ON public.refoua_campaigns(refoua_id);

-- Créneaux réservés
CREATE TABLE public.refoua_campaign_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.refoua_campaigns(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  slot_index integer NOT NULL,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  claimed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, day_number, slot_index)
);

ALTER TABLE public.refoua_campaign_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view slots"
  ON public.refoua_campaign_slots FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can claim slot"
  ON public.refoua_campaign_slots FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner or campaign creator can release slot"
  ON public.refoua_campaign_slots FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.refoua_campaigns c
      WHERE c.id = refoua_campaign_slots.campaign_id
        AND c.created_by = auth.uid()
    )
  );

CREATE INDEX idx_refoua_campaign_slots_campaign ON public.refoua_campaign_slots(campaign_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.refoua_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.refoua_campaign_slots;