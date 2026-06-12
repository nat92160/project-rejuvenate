DROP POLICY IF EXISTS "Anyone can join" ON public.zohar_brit_participants;

CREATE POLICY "Anyone can join"
  ON public.zohar_brit_participants
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      user_id IS NULL
      AND anon_id IS NOT NULL
      AND length(trim(anon_id)) BETWEEN 8 AND 120
      AND display_name IS NOT NULL
      AND length(trim(display_name)) BETWEEN 1 AND 80
    )
    OR auth.uid() = user_id
  );