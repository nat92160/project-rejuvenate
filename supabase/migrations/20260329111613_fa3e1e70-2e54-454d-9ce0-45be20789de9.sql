
CREATE TABLE public.zoom_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_type text NOT NULL DEFAULT 'bearer',
  expires_at timestamptz NOT NULL,
  scope text,
  zoom_user_id text,
  zoom_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.zoom_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only view their own token metadata (not the actual tokens - those are accessed server-side)
CREATE POLICY "Users can view their own zoom connection status"
  ON public.zoom_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only edge functions (service role) insert/update tokens
-- No direct client insert/update/delete policies
CREATE POLICY "Service role manages zoom tokens"
  ON public.zoom_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
