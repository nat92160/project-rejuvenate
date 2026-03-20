CREATE UNIQUE INDEX IF NOT EXISTS synagogue_chat_requests_synagogue_user_uidx
ON public.synagogue_chat_requests (synagogue_id, user_id);

DROP POLICY IF EXISTS "Subscribers and president can send messages" ON public.synagogue_messages;
CREATE POLICY "Approved members and president can send messages"
ON public.synagogue_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1
      FROM public.synagogue_profiles
      WHERE synagogue_profiles.id = synagogue_messages.synagogue_id
        AND synagogue_profiles.president_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.synagogue_chat_requests
      WHERE synagogue_chat_requests.synagogue_id = synagogue_messages.synagogue_id
        AND synagogue_chat_requests.user_id = auth.uid()
        AND synagogue_chat_requests.status = 'approved'
    )
  )
);

DROP POLICY IF EXISTS "Subscribers and president can view messages" ON public.synagogue_messages;
CREATE POLICY "Approved members and president can view messages"
ON public.synagogue_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.synagogue_profiles
    WHERE synagogue_profiles.id = synagogue_messages.synagogue_id
      AND synagogue_profiles.president_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.synagogue_chat_requests
    WHERE synagogue_chat_requests.synagogue_id = synagogue_messages.synagogue_id
      AND synagogue_chat_requests.user_id = auth.uid()
      AND synagogue_chat_requests.status = 'approved'
  )
);