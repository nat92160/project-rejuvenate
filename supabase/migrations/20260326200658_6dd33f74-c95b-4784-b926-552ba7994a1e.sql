
-- Fix SELECT policy: allow viewing pending suggestions by the submitter (including guests via place_id)
DROP POLICY IF EXISTS "Anyone can view approved suggestions" ON public.prayer_time_suggestions;

CREATE POLICY "Anyone can view approved suggestions"
ON public.prayer_time_suggestions FOR SELECT
TO public
USING (
  (status = 'approved')
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR (user_id IS NULL AND status = 'pending')
);
