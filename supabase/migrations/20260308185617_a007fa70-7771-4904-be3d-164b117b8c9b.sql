
-- Create storage bucket for collection cover images
INSERT INTO storage.buckets (id, name, public) VALUES ('collection-covers', 'collection-covers', true);

-- Allow authenticated users to upload cover images
CREATE POLICY "Authenticated users can upload covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'collection-covers');

-- Allow anyone to view cover images (public bucket)
CREATE POLICY "Anyone can view collection covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'collection-covers');

-- Allow users to update their own uploads
CREATE POLICY "Users can update own covers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'collection-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own covers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'collection-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
