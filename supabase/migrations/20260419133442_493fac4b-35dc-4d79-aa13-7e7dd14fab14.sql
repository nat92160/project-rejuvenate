-- 1. Table de compteurs CERFA dédiée (1 ligne par synagogue + année)
CREATE TABLE IF NOT EXISTS public.cerfa_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synagogue_id uuid NOT NULL REFERENCES public.synagogue_profiles(id) ON DELETE CASCADE,
  fiscal_year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (synagogue_id, fiscal_year)
);

ALTER TABLE public.cerfa_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cerfa counters"
ON public.cerfa_counters FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Presidents can view their synagogue counters"
ON public.cerfa_counters FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.synagogue_profiles sp
  WHERE sp.id = cerfa_counters.synagogue_id
    AND (sp.president_id = auth.uid() OR sp.adjoint_id = auth.uid())
));

CREATE TRIGGER update_cerfa_counters_updated_at
BEFORE UPDATE ON public.cerfa_counters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Fonction atomique d'attribution du prochain numéro CERFA
CREATE OR REPLACE FUNCTION public.next_cerfa_number(_synagogue_id uuid, _fiscal_year integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_value integer;
  _formatted text;
BEGIN
  -- Upsert atomique : crée la ligne si absente, sinon incrémente
  INSERT INTO public.cerfa_counters (synagogue_id, fiscal_year, last_number)
  VALUES (_synagogue_id, _fiscal_year, 1)
  ON CONFLICT (synagogue_id, fiscal_year)
  DO UPDATE SET last_number = cerfa_counters.last_number + 1,
                updated_at = now()
  RETURNING last_number INTO _new_value;

  _formatted := 'A' || _fiscal_year::text || '/' || lpad(_new_value::text, 5, '0');
  RETURN _formatted;
END;
$$;

-- 3. Mise à jour de assign_cerfa_number pour utiliser le nouveau compteur
CREATE OR REPLACE FUNCTION public.assign_cerfa_number(_donation_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _syna_id uuid;
  _year integer;
  _existing text;
  _formatted text;
BEGIN
  SELECT cerfa_number, synagogue_id, fiscal_year
    INTO _existing, _syna_id, _year
  FROM public.donations
  WHERE id = _donation_id;

  -- Numéro déjà attribué → renvoyer tel quel (jamais ré-attribuer)
  IF _existing IS NOT NULL THEN
    RETURN _existing;
  END IF;

  IF _syna_id IS NULL OR _year IS NULL THEN
    RETURN NULL;
  END IF;

  _formatted := public.next_cerfa_number(_syna_id, _year);

  UPDATE public.donations
     SET cerfa_number = _formatted
   WHERE id = _donation_id
     AND cerfa_number IS NULL; -- protection anti-doublon

  RETURN _formatted;
END;
$$;

-- 4. Table de suivi des reversements de commission
CREATE TABLE IF NOT EXISTS public.cerfa_commission_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synagogue_id uuid NOT NULL REFERENCES public.synagogue_profiles(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_donations_amount integer NOT NULL DEFAULT 0,
  commission_amount integer NOT NULL DEFAULT 0,
  payout_amount integer NOT NULL DEFAULT 0,
  paid_at timestamptz,
  paid_by uuid,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cerfa_commission_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage commission payouts"
ON public.cerfa_commission_payouts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Presidents view their commission payouts"
ON public.cerfa_commission_payouts FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.synagogue_profiles sp
  WHERE sp.id = cerfa_commission_payouts.synagogue_id
    AND (sp.president_id = auth.uid() OR sp.adjoint_id = auth.uid())
));

CREATE TRIGGER update_cerfa_commission_payouts_updated_at
BEFORE UPDATE ON public.cerfa_commission_payouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Initialisation des compteurs depuis les numéros CERFA déjà attribués
INSERT INTO public.cerfa_counters (synagogue_id, fiscal_year, last_number)
SELECT
  d.synagogue_id,
  d.fiscal_year,
  COALESCE(MAX(
    CASE
      WHEN d.cerfa_number ~ '^A[0-9]{4}/[0-9]+$'
      THEN (split_part(d.cerfa_number, '/', 2))::int
      ELSE 0
    END
  ), 0)
FROM public.donations d
WHERE d.cerfa_number IS NOT NULL
  AND d.synagogue_id IS NOT NULL
  AND d.fiscal_year IS NOT NULL
GROUP BY d.synagogue_id, d.fiscal_year
ON CONFLICT (synagogue_id, fiscal_year) DO NOTHING;