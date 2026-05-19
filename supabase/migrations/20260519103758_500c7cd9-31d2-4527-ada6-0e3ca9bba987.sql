
CREATE TABLE public.refoua_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  refoua_id UUID NOT NULL REFERENCES public.refoua_chelema(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  action_type TEXT NOT NULL CHECK (action_type IN ('tehilim','nichmat','prayed')),
  psalm_number INTEGER CHECK (psalm_number BETWEEN 1 AND 150),
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Un psaume unique par malade et par jour
CREATE UNIQUE INDEX refoua_actions_unique_psalm
  ON public.refoua_actions (refoua_id, action_date, psalm_number)
  WHERE action_type = 'tehilim' AND psalm_number IS NOT NULL;

-- Une "prière" par utilisateur par malade par jour
CREATE UNIQUE INDEX refoua_actions_unique_prayed
  ON public.refoua_actions (refoua_id, user_id, action_date)
  WHERE action_type = 'prayed';

CREATE INDEX refoua_actions_refoua_idx ON public.refoua_actions(refoua_id, action_date);

ALTER TABLE public.refoua_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view refoua actions"
  ON public.refoua_actions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create their refoua actions"
  ON public.refoua_actions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their refoua actions"
  ON public.refoua_actions FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.refoua_chelema r
      WHERE r.id = refoua_actions.refoua_id AND r.added_by = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.refoua_actions;
