
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('affiches', 'affiches', true, 5242880, ARRAY['image/png', 'image/jpeg']);

CREATE POLICY "Anyone can read affiches"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'affiches');

CREATE POLICY "Anyone can upload affiches"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'affiches');
