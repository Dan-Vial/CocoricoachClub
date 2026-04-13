
-- Add image_url column to exercise_library
ALTER TABLE public.exercise_library ADD COLUMN image_url text DEFAULT NULL;

-- Create storage bucket for exercise images
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-images', 'exercise-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload exercise images
CREATE POLICY "Authenticated users can upload exercise images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exercise-images');

-- Allow public read access to exercise images
CREATE POLICY "Public read access to exercise images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'exercise-images');

-- Allow users to update their own exercise images
CREATE POLICY "Users can update own exercise images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'exercise-images');

-- Allow users to delete their own exercise images
CREATE POLICY "Users can delete own exercise images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exercise-images');
