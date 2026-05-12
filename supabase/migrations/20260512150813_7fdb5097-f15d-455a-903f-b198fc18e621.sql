
-- Backup table: snapshots all account data (profile + roles + synagogues + subscriptions)
CREATE TABLE public.account_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  display_name text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL DEFAULT 'auto_daily',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_backups_user ON public.account_backups(user_id);
CREATE INDEX idx_account_backups_created ON public.account_backups(created_at DESC);
CREATE INDEX idx_account_backups_reason ON public.account_backups(reason);

ALTER TABLE public.account_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all backups"
ON public.account_backups FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages backups"
ON public.account_backups FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Admins can insert manual backups"
ON public.account_backups FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete old backups"
ON public.account_backups FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
