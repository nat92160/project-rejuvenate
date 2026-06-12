GRANT INSERT, UPDATE ON public.zohar_brit_sessions TO anon;
GRANT INSERT, UPDATE, DELETE ON public.zohar_brit_participants TO anon;

DROP POLICY IF EXISTS "Authenticated users can create sessions" ON public.zohar_brit_sessions;
CREATE POLICY "Anyone can create sessions"
  ON public.zohar_brit_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND creator_id IS NULL)
    OR auth.uid() = creator_id
  );

DROP POLICY IF EXISTS "Anyone authenticated can update active sessions" ON public.zohar_brit_sessions;
CREATE POLICY "Anyone can update active sessions"
  ON public.zohar_brit_sessions FOR UPDATE
  TO anon, authenticated
  USING (status = 'active')
  WITH CHECK (status IN ('active','completed'));

DROP POLICY IF EXISTS "Anyone authenticated can join" ON public.zohar_brit_participants;
CREATE POLICY "Anyone can join"
  ON public.zohar_brit_participants FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL AND anon_id IS NOT NULL)
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Participant can leave" ON public.zohar_brit_participants;
CREATE POLICY "Participant can leave"
  ON public.zohar_brit_participants FOR DELETE
  TO anon, authenticated
  USING (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR auth.uid() = user_id
  );