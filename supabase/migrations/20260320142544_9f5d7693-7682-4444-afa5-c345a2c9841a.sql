
-- Create president requests table
CREATE TABLE public.president_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  synagogue_name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Paris',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.president_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own requests"
ON public.president_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.president_requests FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can create their own request
CREATE POLICY "Users can create requests"
ON public.president_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only admins can update requests (approve/reject)
CREATE POLICY "Admins can update requests"
ON public.president_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Assign admin role to nathan@marciano1.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('96a40731-e099-40a6-a94c-5defe05caa47', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
