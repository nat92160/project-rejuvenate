ALTER TABLE public.synagogue_profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.synagogue_profiles;