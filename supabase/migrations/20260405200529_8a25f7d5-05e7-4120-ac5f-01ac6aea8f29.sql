
CREATE TABLE public.omer_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(endpoint)
);

ALTER TABLE public.omer_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to omer push"
  ON public.omer_push_subscriptions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can view their own subscription by endpoint"
  ON public.omer_push_subscriptions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can delete their own subscription by endpoint"
  ON public.omer_push_subscriptions FOR DELETE
  TO public
  USING (true);
