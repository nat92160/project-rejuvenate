
-- Allow anyone to claim a slot (with display_name length limits)
DROP POLICY IF EXISTS "Authenticated users can claim slot" ON public.refoua_campaign_slots;

CREATE POLICY "Anyone can claim slot"
ON public.refoua_campaign_slots
FOR INSERT
TO public
WITH CHECK (
  length(display_name) >= 1
  AND length(display_name) <= 60
  AND (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

-- Allow guests to release their own (anonymous) slots within the same browser is not enforceable;
-- keep delete restricted to owner or campaign creator
DROP POLICY IF EXISTS "Owner or campaign creator can release slot" ON public.refoua_campaign_slots;

CREATE POLICY "Owner or campaign creator can release slot"
ON public.refoua_campaign_slots
FOR DELETE
TO public
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR EXISTS (
    SELECT 1 FROM public.refoua_campaigns c
    WHERE c.id = refoua_campaign_slots.campaign_id
      AND c.created_by = auth.uid()
  )
);
