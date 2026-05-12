
-- AFFICHES bucket
DROP POLICY IF EXISTS "Anyone can read affiches" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload affiches" ON storage.objects;

CREATE POLICY "Authenticated can list affiches"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'affiches');

CREATE POLICY "Authenticated can upload affiches"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'affiches' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can delete their affiches"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'affiches' AND auth.uid()::text = (storage.foldername(name))[1]);

-- SYNAGOGUE-LOGOS bucket
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Presidents can upload logos" ON storage.objects;

CREATE POLICY "Authenticated can list logos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'synagogue-logos');

CREATE POLICY "Presidents can upload logos scoped"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'synagogue-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
