-- Sessions
CREATE TABLE public.zohar_brit_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  creator_id uuid,
  version text NOT NULL CHECK (version IN ('court','complet')),
  participants_count int NOT NULL CHECK (participants_count BETWEEN 1 AND 60),
  title text,
  assignments jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.zohar_brit_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zohar_brit_sessions TO authenticated;
GRANT ALL ON public.zohar_brit_sessions TO service_role;

ALTER TABLE public.zohar_brit_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions are readable by everyone"
  ON public.zohar_brit_sessions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create sessions"
  ON public.zohar_brit_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Anyone authenticated can update active sessions"
  ON public.zohar_brit_sessions FOR UPDATE
  TO authenticated
  USING (status = 'active')
  WITH CHECK (status IN ('active','completed'));

CREATE POLICY "Creator can delete own session"
  ON public.zohar_brit_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

CREATE TRIGGER zohar_brit_sessions_updated_at
  BEFORE UPDATE ON public.zohar_brit_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Participants
CREATE TABLE public.zohar_brit_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.zohar_brit_sessions(id) ON DELETE CASCADE,
  user_id uuid,
  anon_id text,
  display_name text NOT NULL,
  slot_index int,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, slot_index)
);

CREATE INDEX zohar_brit_participants_session_idx ON public.zohar_brit_participants(session_id);

GRANT SELECT ON public.zohar_brit_participants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zohar_brit_participants TO authenticated;
GRANT ALL ON public.zohar_brit_participants TO service_role;

ALTER TABLE public.zohar_brit_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants readable by everyone"
  ON public.zohar_brit_participants FOR SELECT
  USING (true);

CREATE POLICY "Anyone authenticated can join"
  ON public.zohar_brit_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participant can leave"
  ON public.zohar_brit_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.zohar_brit_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.zohar_brit_participants;
ALTER TABLE public.zohar_brit_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.zohar_brit_participants REPLICA IDENTITY FULL;