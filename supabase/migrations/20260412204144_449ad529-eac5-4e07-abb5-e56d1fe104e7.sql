
-- Table pour tracker les rappels Omer envoyés
CREATE TABLE public.omer_reminder_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  omer_day integer NOT NULL,
  omer_year integer NOT NULL DEFAULT EXTRACT(year FROM now()),
  sent_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.omer_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage omer reminder log"
  ON public.omer_reminder_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view omer reminder log"
  ON public.omer_reminder_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_omer_reminder_log_lookup
  ON public.omer_reminder_log (user_id, omer_day, omer_year);

-- Table pour tracker les notifications Chabbat envoyées
CREATE TABLE public.shabbat_notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  synagogue_id uuid,
  shabbat_date date NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shabbat_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage shabbat notification log"
  ON public.shabbat_notification_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view shabbat notification log"
  ON public.shabbat_notification_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_shabbat_notif_log_lookup
  ON public.shabbat_notification_log (user_id, shabbat_date);
