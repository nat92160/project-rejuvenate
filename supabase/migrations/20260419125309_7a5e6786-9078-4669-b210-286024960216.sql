-- 1. Allow authenticated users to view donations matching their email
CREATE POLICY "Donors can view donations by their email"
ON public.donations
FOR SELECT
TO authenticated
USING (donor_email = auth.email());

-- 2. Backfill donor_user_id for existing donations where email matches a registered user
UPDATE public.donations d
SET donor_user_id = u.id
FROM auth.users u
WHERE d.donor_user_id IS NULL
  AND lower(d.donor_email) = lower(u.email);

-- 3. Auto-link future donations on insert via trigger
CREATE OR REPLACE FUNCTION public.link_donation_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.donor_user_id IS NULL AND NEW.donor_email IS NOT NULL THEN
    SELECT id INTO NEW.donor_user_id
    FROM auth.users
    WHERE lower(email) = lower(NEW.donor_email)
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_donation_to_user_trigger ON public.donations;
CREATE TRIGGER link_donation_to_user_trigger
BEFORE INSERT ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.link_donation_to_user();