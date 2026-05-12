CREATE OR REPLACE FUNCTION public.prune_account_backups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.account_backups
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id FROM public.account_backups
      WHERE user_id = NEW.user_id
      ORDER BY created_at DESC
      LIMIT 3
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prune_account_backups_trigger ON public.account_backups;
CREATE TRIGGER prune_account_backups_trigger
AFTER INSERT ON public.account_backups
FOR EACH ROW EXECUTE FUNCTION public.prune_account_backups();