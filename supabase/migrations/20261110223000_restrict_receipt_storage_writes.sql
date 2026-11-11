-- Keep receipt storage private and readable by authorized order participants,
-- but disable direct client uploads and deletes while checkout is COD-only.
-- Store and product media retain owner-scoped write access.

DROP POLICY IF EXISTS "Media owner upload" ON storage.objects;
CREATE POLICY "Media owner upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = ANY (ARRAY['store-media'::text, 'product-media'::text])
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

DROP POLICY IF EXISTS "Media owner delete" ON storage.objects;
CREATE POLICY "Media owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = ANY (ARRAY['store-media'::text, 'product-media'::text])
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
