-- Table for Stripe Connect accounts linked to synagogues
CREATE TABLE public.synagogue_stripe_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synagogue_id uuid NOT NULL REFERENCES public.synagogue_profiles(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL,
  is_onboarded boolean NOT NULL DEFAULT false,
  custom_donation_slug text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(synagogue_id)
);

-- Table for donations
CREATE TABLE public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synagogue_id uuid NOT NULL REFERENCES public.synagogue_profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  donor_email text NOT NULL,
  donor_name text NOT NULL DEFAULT '',
  stripe_payment_id text,
  stripe_checkout_session_id text,
  cerfa_generated boolean NOT NULL DEFAULT false,
  cerfa_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.synagogue_stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stripe accounts for donation pages"
  ON public.synagogue_stripe_accounts FOR SELECT
  TO public USING (true);

CREATE POLICY "President can manage their stripe account"
  ON public.synagogue_stripe_accounts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.synagogue_profiles
      WHERE synagogue_profiles.id = synagogue_stripe_accounts.synagogue_id
        AND (synagogue_profiles.president_id = auth.uid() OR synagogue_profiles.adjoint_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.synagogue_profiles
      WHERE synagogue_profiles.id = synagogue_stripe_accounts.synagogue_id
        AND (synagogue_profiles.president_id = auth.uid() OR synagogue_profiles.adjoint_id = auth.uid())
    )
  );

CREATE POLICY "President can view their synagogue donations"
  ON public.donations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.synagogue_profiles
      WHERE synagogue_profiles.id = donations.synagogue_id
        AND (synagogue_profiles.president_id = auth.uid() OR synagogue_profiles.adjoint_id = auth.uid())
    )
  );

CREATE POLICY "Anyone can insert donations via webhook"
  ON public.donations FOR INSERT
  TO public
  WITH CHECK (true);

CREATE TRIGGER update_stripe_accounts_updated_at
  BEFORE UPDATE ON public.synagogue_stripe_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();