
-- Table for storing multiple Zoom accounts per president
CREATE TABLE public.zoom_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  president_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Compte principal',
  zoom_account_id TEXT NOT NULL,
  zoom_client_id TEXT NOT NULL,
  zoom_client_secret TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zoom_accounts ENABLE ROW LEVEL SECURITY;

-- Only the president who owns the account can see it
CREATE POLICY "Presidents can view their own zoom accounts"
ON public.zoom_accounts FOR SELECT
TO authenticated
USING (auth.uid() = president_id);

-- Only presidents can create zoom accounts
CREATE POLICY "Presidents can create zoom accounts"
ON public.zoom_accounts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = president_id AND has_role(auth.uid(), 'president'::app_role));

-- Presidents can update their own accounts
CREATE POLICY "Presidents can update their own zoom accounts"
ON public.zoom_accounts FOR UPDATE
TO authenticated
USING (auth.uid() = president_id);

-- Presidents can delete their own accounts
CREATE POLICY "Presidents can delete their own zoom accounts"
ON public.zoom_accounts FOR DELETE
TO authenticated
USING (auth.uid() = president_id);
