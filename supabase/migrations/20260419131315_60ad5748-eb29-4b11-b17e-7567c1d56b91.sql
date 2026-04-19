-- 1. Ajout des colonnes manquantes pour le CERFA officiel 2041-RD
ALTER TABLE public.synagogue_profiles
  ADD COLUMN IF NOT EXISTS signature_image_url text,
  ADD COLUMN IF NOT EXISTS organism_quality text DEFAULT 'Œuvre ou organisme d''intérêt général',
  ADD COLUMN IF NOT EXISTS cerfa_counter_year integer,
  ADD COLUMN IF NOT EXISTS cerfa_counter_value integer NOT NULL DEFAULT 0;

-- 2. Fonction sécurisée pour attribuer un numéro CERFA séquentiel par synagogue+année.
-- Elle est appelée par l'edge function generate-cerfa lorsqu'un don n'a pas encore de cerfa_number.
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
  _new_value integer;
  _formatted text;
BEGIN
  SELECT cerfa_number, synagogue_id, fiscal_year
    INTO _existing, _syna_id, _year
  FROM public.donations
  WHERE id = _donation_id;

  IF _existing IS NOT NULL THEN
    RETURN _existing;
  END IF;

  IF _syna_id IS NULL OR _year IS NULL THEN
    RETURN NULL;
  END IF;

  -- Réinitialise le compteur si on change d'année fiscale
  UPDATE public.synagogue_profiles
     SET cerfa_counter_year = _year,
         cerfa_counter_value = CASE WHEN cerfa_counter_year = _year THEN cerfa_counter_value ELSE 0 END
   WHERE id = _syna_id;

  -- Incrémente atomiquement et récupère la nouvelle valeur
  UPDATE public.synagogue_profiles
     SET cerfa_counter_value = cerfa_counter_value + 1
   WHERE id = _syna_id
   RETURNING cerfa_counter_value INTO _new_value;

  _formatted := 'A' || _year::text || '/' || lpad(_new_value::text, 5, '0');

  UPDATE public.donations
     SET cerfa_number = _formatted
   WHERE id = _donation_id;

  RETURN _formatted;
END;
$$;

-- 3. Politique d'accès pour permettre l'upload de signatures dans le bucket synagogue-logos
-- (bucket déjà public, on n'ajoute rien ici puisque les signatures iront dans le même bucket).