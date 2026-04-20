
-- Create storage bucket for bowling ball images
INSERT INTO storage.buckets (id, name, public)
VALUES ('bowling-ball-images', 'bowling-ball-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone authenticated to upload
CREATE POLICY "Authenticated users can upload bowling ball images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bowling-ball-images');

-- Allow anyone to view
CREATE POLICY "Anyone can view bowling ball images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bowling-ball-images');

-- Allow authenticated users to update/delete their uploads
CREATE POLICY "Authenticated users can update bowling ball images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'bowling-ball-images');

CREATE POLICY "Authenticated users can delete bowling ball images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bowling-ball-images');
