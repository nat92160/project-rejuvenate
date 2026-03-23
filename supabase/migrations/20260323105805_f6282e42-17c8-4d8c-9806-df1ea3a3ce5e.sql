
-- Table for participative prayer time suggestions
CREATE TABLE public.prayer_time_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synagogue_id uuid REFERENCES public.synagogue_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  office_name text NOT NULL, -- shacharit, minha, arvit
  time_value text, -- fixed time like "07:30"
  time_rule text, -- rule like "15 min avant coucher du soleil"
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  verified boolean NOT NULL DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prayer_time_suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved suggestions
CREATE POLICY "Anyone can view approved suggestions"
  ON public.prayer_time_suggestions FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id);

-- Authenticated users can create suggestions
CREATE POLICY "Authenticated users can create suggestions"
  ON public.prayer_time_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin or president can update suggestions (approve/reject)
CREATE POLICY "Admin or president can update suggestions"
  ON public.prayer_time_suggestions FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.synagogue_profiles
      WHERE id = prayer_time_suggestions.synagogue_id
      AND (president_id = auth.uid() OR adjoint_id = auth.uid())
    )
  );

-- Admin or president can delete suggestions
CREATE POLICY "Admin or president can delete suggestions"
  ON public.prayer_time_suggestions FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.synagogue_profiles
      WHERE id = prayer_time_suggestions.synagogue_id
      AND (president_id = auth.uid() OR adjoint_id = auth.uid())
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_prayer_time_suggestions_updated_at
  BEFORE UPDATE ON public.prayer_time_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
