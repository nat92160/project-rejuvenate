
DROP POLICY "Anyone can view approved suggestions" ON public.prayer_time_suggestions;

CREATE POLICY "View suggestions based on role" ON public.prayer_time_suggestions
FOR SELECT USING (
  -- Admins see everything
  has_role(auth.uid(), 'admin'::app_role)
  -- Presidents/adjoints see their synagogue's suggestions
  OR EXISTS (
    SELECT 1 FROM synagogue_profiles
    WHERE synagogue_profiles.id = prayer_time_suggestions.synagogue_id
    AND (synagogue_profiles.president_id = auth.uid() OR synagogue_profiles.adjoint_id = auth.uid())
  )
  -- Users see their own suggestions
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  -- Anyone sees approved suggestions
  OR status = 'approved'
  -- Anonymous pending suggestions visible to all
  OR (user_id IS NULL AND status = 'pending')
);
