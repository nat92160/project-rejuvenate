-- ========== content_reactions ==========
CREATE TABLE public.content_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('annonce','horaire','evenement')),
  content_id text NOT NULL,
  synagogue_id uuid,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  emoji text NOT NULL CHECK (emoji IN ('❤️','🙏','✅','👏','🔥')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_type, content_id, user_id, emoji)
);
CREATE INDEX idx_reactions_content ON public.content_reactions(content_type, content_id);
ALTER TABLE public.content_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions" ON public.content_reactions
  FOR SELECT USING (true);
CREATE POLICY "Authenticated can react" ON public.content_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND length(display_name) <= 80);
CREATE POLICY "Users can remove own reaction" ON public.content_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ========== content_comments ==========
CREATE TABLE public.content_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('annonce','horaire','evenement')),
  content_id text NOT NULL,
  synagogue_id uuid,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 600),
  is_president boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_content ON public.content_comments(content_type, content_id, created_at);
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON public.content_comments
  FOR SELECT USING (true);
CREATE POLICY "Authenticated can comment" ON public.content_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND length(display_name) <= 80);
CREATE POLICY "Author or moderator can delete" ON public.content_comments
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id
    OR private.has_role(auth.uid(), 'admin'::app_role)
    OR (synagogue_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.synagogue_profiles sp
      WHERE sp.id = synagogue_id AND (sp.president_id = auth.uid() OR sp.adjoint_id = auth.uid())
    ))
  );

-- ========== Anti-spam: max 10 comments per user per content per hour ==========
CREATE OR REPLACE FUNCTION public.check_comment_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cnt int;
BEGIN
  SELECT count(*) INTO _cnt FROM public.content_comments
   WHERE user_id = NEW.user_id
     AND content_type = NEW.content_type
     AND content_id = NEW.content_id
     AND created_at > now() - interval '1 hour';
  IF _cnt >= 10 THEN
    RAISE EXCEPTION 'Trop de commentaires (limite: 10/heure sur ce contenu)';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_comment_rate_limit
  BEFORE INSERT ON public.content_comments
  FOR EACH ROW EXECUTE FUNCTION public.check_comment_rate_limit();

-- ========== Realtime ==========
ALTER TABLE public.content_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.content_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_comments;