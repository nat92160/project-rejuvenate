
-- Table pour le profil de la synagogue (single tenant, un seul président)
CREATE TABLE public.synagogue_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  president_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  signature TEXT DEFAULT '',
  primary_color TEXT DEFAULT '#1e3a5f',
  secondary_color TEXT DEFAULT '#c9a84c',
  font_family TEXT DEFAULT 'Lora',
  speakers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_president UNIQUE (president_id)
);

-- Enable RLS
ALTER TABLE public.synagogue_profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read the synagogue profile (for branding)
CREATE POLICY "Anyone can view synagogue profile"
  ON public.synagogue_profiles FOR SELECT
  USING (true);

-- Only the president who owns the profile can insert
CREATE POLICY "President can create their profile"
  ON public.synagogue_profiles FOR INSERT
  WITH CHECK (auth.uid() = president_id AND public.has_role(auth.uid(), 'president'));

-- Only the president who owns the profile can update
CREATE POLICY "President can update their profile"
  ON public.synagogue_profiles FOR UPDATE
  USING (auth.uid() = president_id AND public.has_role(auth.uid(), 'president'));

-- Only the president who owns the profile can delete
CREATE POLICY "President can delete their profile"
  ON public.synagogue_profiles FOR DELETE
  USING (auth.uid() = president_id AND public.has_role(auth.uid(), 'president'));

-- Auto-update updated_at
CREATE TRIGGER update_synagogue_profiles_updated_at
  BEFORE UPDATE ON public.synagogue_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for synagogue logos
INSERT INTO storage.buckets (id, name, public) VALUES ('synagogue-logos', 'synagogue-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'synagogue-logos');

CREATE POLICY "Presidents can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'synagogue-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Presidents can update logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'synagogue-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Presidents can delete logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'synagogue-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
