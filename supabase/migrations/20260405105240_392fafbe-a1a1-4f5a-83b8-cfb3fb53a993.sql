
CREATE TABLE public.youtube_courses_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL UNIQUE,
  channel_id text NOT NULL,
  channel_name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  thumbnail_url text NOT NULL DEFAULT '',
  published_at timestamp with time zone NOT NULL,
  duration text,
  view_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.youtube_courses_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view youtube courses cache"
ON public.youtube_courses_cache FOR SELECT
TO public
USING (true);

CREATE POLICY "Service role can manage youtube cache"
ON public.youtube_courses_cache FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX idx_youtube_courses_published ON public.youtube_courses_cache (published_at DESC);
CREATE INDEX idx_youtube_courses_channel ON public.youtube_courses_cache (channel_id);
