
-- Chat messages table for synagogue <-> fideles communication
CREATE TABLE public.synagogue_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synagogue_id uuid NOT NULL REFERENCES public.synagogue_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  content text NOT NULL,
  is_president boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.synagogue_messages ENABLE ROW LEVEL SECURITY;

-- Anyone subscribed (or the president) can view messages
CREATE POLICY "Subscribers and president can view messages"
  ON public.synagogue_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.synagogue_subscriptions
      WHERE synagogue_subscriptions.user_id = auth.uid()
        AND synagogue_subscriptions.synagogue_id = synagogue_messages.synagogue_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.synagogue_profiles
      WHERE synagogue_profiles.id = synagogue_messages.synagogue_id
        AND synagogue_profiles.president_id = auth.uid()
    )
  );

-- Authenticated users can send messages (if subscribed or president)
CREATE POLICY "Subscribers and president can send messages"
  ON public.synagogue_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.synagogue_subscriptions
        WHERE synagogue_subscriptions.user_id = auth.uid()
          AND synagogue_subscriptions.synagogue_id = synagogue_messages.synagogue_id
      )
      OR
      EXISTS (
        SELECT 1 FROM public.synagogue_profiles
        WHERE synagogue_profiles.id = synagogue_messages.synagogue_id
          AND synagogue_profiles.president_id = auth.uid()
      )
    )
  );

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON public.synagogue_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- President can delete any message in their synagogue
CREATE POLICY "President can delete any message in their synagogue"
  ON public.synagogue_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.synagogue_profiles
      WHERE synagogue_profiles.id = synagogue_messages.synagogue_id
        AND synagogue_profiles.president_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_syna_messages_synagogue ON public.synagogue_messages(synagogue_id, created_at);
CREATE INDEX idx_syna_messages_user ON public.synagogue_messages(user_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.synagogue_messages;
