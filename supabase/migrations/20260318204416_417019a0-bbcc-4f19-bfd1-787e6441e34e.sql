
-- Table des sessions de Minyan (offices)
CREATE TABLE public.minyan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synagogue_id uuid,
  creator_id uuid NOT NULL,
  office_type text NOT NULL DEFAULT 'shacharit',
  office_date date NOT NULL DEFAULT CURRENT_DATE,
  office_time time NOT NULL,
  target_count int NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.minyan_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view minyan sessions" ON public.minyan_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Presidents can create sessions" ON public.minyan_sessions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'president') AND auth.uid() = creator_id);
CREATE POLICY "Creator can update sessions" ON public.minyan_sessions FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Creator can delete sessions" ON public.minyan_sessions FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- Table des inscriptions au Minyan
CREATE TABLE public.minyan_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.minyan_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.minyan_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view registrations" ON public.minyan_registrations FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can register" ON public.minyan_registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own registration" ON public.minyan_registrations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Unique constraint: one registration per user per session
ALTER TABLE public.minyan_registrations ADD CONSTRAINT unique_user_session UNIQUE (session_id, user_id);

-- Enable realtime for minyan
ALTER PUBLICATION supabase_realtime ADD TABLE public.minyan_registrations;

-- Table des annonces
CREATE TABLE public.annonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.annonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view annonces" ON public.annonces FOR SELECT TO public USING (true);
CREATE POLICY "Presidents can create annonces" ON public.annonces FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'president') AND auth.uid() = creator_id);
CREATE POLICY "Creator can update annonces" ON public.annonces FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Creator can delete annonces" ON public.annonces FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- Table des événements avec zoom_link
CREATE TABLE public.evenements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  event_date date NOT NULL,
  event_time text NOT NULL,
  location text NOT NULL DEFAULT '',
  event_type text NOT NULL DEFAULT 'autre',
  zoom_link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evenements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view evenements" ON public.evenements FOR SELECT TO public USING (true);
CREATE POLICY "Presidents can create evenements" ON public.evenements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'president') AND auth.uid() = creator_id);
CREATE POLICY "Creator can update evenements" ON public.evenements FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Creator can delete evenements" ON public.evenements FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- Table des cours Zoom
CREATE TABLE public.cours_zoom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  rav text NOT NULL DEFAULT '',
  day_of_week text NOT NULL,
  course_time time NOT NULL,
  zoom_link text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cours_zoom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cours" ON public.cours_zoom FOR SELECT TO public USING (true);
CREATE POLICY "Presidents can create cours" ON public.cours_zoom FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'president') AND auth.uid() = creator_id);
CREATE POLICY "Creator can update cours" ON public.cours_zoom FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Creator can delete cours" ON public.cours_zoom FOR DELETE TO authenticated USING (auth.uid() = creator_id);
