
-- Create refoua_chelema table
CREATE TABLE public.refoua_chelema (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hebrew_name TEXT NOT NULL,
  mother_name TEXT NOT NULL DEFAULT '',
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refoua_chelema ENABLE ROW LEVEL SECURITY;

-- Anyone can view
CREATE POLICY "Anyone can view refoua list" ON public.refoua_chelema
  FOR SELECT TO public USING (true);

-- Authenticated users can add
CREATE POLICY "Authenticated users can add" ON public.refoua_chelema
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = added_by);

-- Creator or president can delete
CREATE POLICY "Creator can delete" ON public.refoua_chelema
  FOR DELETE TO authenticated USING (auth.uid() = added_by OR has_role(auth.uid(), 'president'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.refoua_chelema;
