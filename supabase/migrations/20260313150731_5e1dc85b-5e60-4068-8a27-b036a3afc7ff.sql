
-- Create videos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Authenticated users can upload videos
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

-- RLS: Anyone can view videos (public bucket)
CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos');

-- RLS: Users can delete their own videos
CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add video_file_url column to video_analyses for uploaded files
ALTER TABLE public.video_analyses ADD COLUMN IF NOT EXISTS video_file_url text;

-- Add video_file_url column to video_clips for uploaded clip files
ALTER TABLE public.video_clips ADD COLUMN IF NOT EXISTS video_file_url text;
