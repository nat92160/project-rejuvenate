-- Table to track sent shabbat reminders (deduplication)
CREATE TABLE public.shabbat_push_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_date date NOT NULL DEFAULT CURRENT_DATE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipients_count int NOT NULL DEFAULT 0
);

-- Unique constraint on date to prevent duplicate sends
ALTER TABLE public.shabbat_push_log ADD CONSTRAINT shabbat_push_log_date_unique UNIQUE (sent_date);

-- Enable pg_cron and pg_net for scheduled push
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;