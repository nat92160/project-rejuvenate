
-- Support chat: each user has one thread that bundles messages with admins.

CREATE TABLE public.support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  subject text NOT NULL DEFAULT 'Contact support',
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_for_admin boolean NOT NULL DEFAULT true,
  unread_for_user boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own thread" ON public.support_threads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all threads" ON public.support_threads
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own thread" ON public.support_threads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own thread" ON public.support_threads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins update any thread" ON public.support_threads
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete threads" ON public.support_threads
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER support_threads_updated_at
  BEFORE UPDATE ON public.support_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('user','admin')),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_messages_thread_idx ON public.support_messages(thread_id, created_at);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own thread messages" ON public.support_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.support_threads t WHERE t.id = thread_id AND t.user_id = auth.uid())
  );
CREATE POLICY "Admins view all messages" ON public.support_messages
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users send message in own thread" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_role = 'user'
    AND sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.support_threads t WHERE t.id = thread_id AND t.user_id = auth.uid())
  );
CREATE POLICY "Admins send messages" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_role = 'admin'
    AND sender_id = auth.uid()
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins delete messages" ON public.support_messages
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to bump thread last_message_at + unread flags
CREATE OR REPLACE FUNCTION public.bump_support_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.support_threads
  SET last_message_at = NEW.created_at,
      updated_at = now(),
      unread_for_admin = CASE WHEN NEW.sender_role = 'user' THEN true ELSE unread_for_admin END,
      unread_for_user  = CASE WHEN NEW.sender_role = 'admin' THEN true ELSE unread_for_user END,
      status = 'open'
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER support_messages_bump_thread
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_support_thread();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
