
-- Remove duplicates keeping the most recent one
DELETE FROM public.push_subscriptions a
USING public.push_subscriptions b
WHERE a.user_id = b.user_id
  AND a.synagogue_id = b.synagogue_id
  AND a.push_type = b.push_type
  AND a.created_at < b.created_at;

-- Now add the unique constraint
ALTER TABLE public.push_subscriptions 
  ADD CONSTRAINT push_subscriptions_user_synagogue_pushtype_key 
  UNIQUE (user_id, synagogue_id, push_type);
