-- Allow anonymous users to insert prayer time suggestions
DROP POLICY IF EXISTS "Authenticated users can create suggestions" ON public.prayer_time_suggestions;

CREATE POLICY "Anyone can create suggestions"
ON public.prayer_time_suggestions
FOR INSERT
TO public
WITH CHECK (true);

-- Make user_id nullable for guest submissions
ALTER TABLE public.prayer_time_suggestions ALTER COLUMN user_id DROP NOT NULL;