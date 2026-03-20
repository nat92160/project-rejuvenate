
-- Add chat_enabled to synagogue_profiles
ALTER TABLE public.synagogue_profiles ADD COLUMN chat_enabled boolean NOT NULL DEFAULT false;

-- Create table for chat speaker requests
CREATE TABLE public.synagogue_chat_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synagogue_id uuid NOT NULL REFERENCES public.synagogue_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(synagogue_id, user_id)
);

ALTER TABLE public.synagogue_chat_requests ENABLE ROW LEVEL SECURITY;

-- Anyone subscribed can see requests status
CREATE POLICY "Users can view their own requests" ON public.synagogue_chat_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "President can view all requests" ON public.synagogue_chat_requests
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM synagogue_profiles WHERE id = synagogue_chat_requests.synagogue_id AND president_id = auth.uid())
  );

CREATE POLICY "Users can create requests" ON public.synagogue_chat_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "President can update requests" ON public.synagogue_chat_requests
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM synagogue_profiles WHERE id = synagogue_chat_requests.synagogue_id AND president_id = auth.uid())
  );

CREATE POLICY "President can delete requests" ON public.synagogue_chat_requests
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM synagogue_profiles WHERE id = synagogue_chat_requests.synagogue_id AND president_id = auth.uid())
  );

-- Allow message editing (UPDATE)
CREATE POLICY "Users can update their own messages" ON public.synagogue_messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
