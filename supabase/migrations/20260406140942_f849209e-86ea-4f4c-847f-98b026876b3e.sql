
ALTER TABLE public.omer_push_subscriptions 
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Paris';

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Paris';
