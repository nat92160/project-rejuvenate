-- 1. Create donation_campaigns table
CREATE TABLE public.donation_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  synagogue_id UUID NOT NULL REFERENCES public.synagogue_profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  goal_amount INTEGER,
  current_amount INTEGER NOT NULL DEFAULT 0,
  cover_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_donation_campaigns_syna ON public.donation_campaigns(synagogue_id);
CREATE INDEX idx_donation_campaigns_active ON public.donation_campaigns(is_active);

ALTER TABLE public.donation_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view donation campaigns"
  ON public.donation_campaigns FOR SELECT
  USING (true);

CREATE POLICY "President or adjoint can create campaigns"
  ON public.donation_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND EXISTS (
      SELECT 1 FROM public.synagogue_profiles sp
      WHERE sp.id = donation_campaigns.synagogue_id
      AND (sp.president_id = auth.uid() OR sp.adjoint_id = auth.uid())
    )
  );

CREATE POLICY "President or adjoint can update campaigns"
  ON public.donation_campaigns FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.synagogue_profiles sp
      WHERE sp.id = donation_campaigns.synagogue_id
      AND (sp.president_id = auth.uid() OR sp.adjoint_id = auth.uid())
    )
  );

CREATE POLICY "President or adjoint can delete campaigns"
  ON public.donation_campaigns FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.synagogue_profiles sp
      WHERE sp.id = donation_campaigns.synagogue_id
      AND (sp.president_id = auth.uid() OR sp.adjoint_id = auth.uid())
    )
  );

CREATE TRIGGER update_donation_campaigns_updated_at
  BEFORE UPDATE ON public.donation_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add columns to donations
ALTER TABLE public.donations
  ADD COLUMN campaign_id UUID REFERENCES public.donation_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN donor_user_id UUID,
  ADD COLUMN cerfa_number TEXT,
  ADD COLUMN fiscal_year INTEGER NOT NULL DEFAULT EXTRACT(year FROM now());

CREATE INDEX idx_donations_campaign ON public.donations(campaign_id);
CREATE INDEX idx_donations_donor_user ON public.donations(donor_user_id);
CREATE INDEX idx_donations_fiscal_year ON public.donations(fiscal_year);

-- Allow donors to see their own donations
CREATE POLICY "Donors can view their own donations"
  ON public.donations FOR SELECT
  TO authenticated
  USING (auth.uid() = donor_user_id);

-- 3. Add CERFA config columns to synagogue_profiles
ALTER TABLE public.synagogue_profiles
  ADD COLUMN association_legal_name TEXT,
  ADD COLUMN association_object TEXT DEFAULT 'Exercice du culte',
  ADD COLUMN rna_number TEXT,
  ADD COLUMN siret_number TEXT,
  ADD COLUMN article_cgi TEXT DEFAULT '200';

-- 4. Trigger to auto-update campaign current_amount when a donation is inserted/updated
CREATE OR REPLACE FUNCTION public.update_campaign_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.campaign_id IS NOT NULL THEN
    UPDATE public.donation_campaigns
    SET current_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.donations
      WHERE campaign_id = NEW.campaign_id
    )
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_campaign_amount
  AFTER INSERT OR UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_amount();