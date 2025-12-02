-- Add avatar_url column to players table
ALTER TABLE public.players
ADD COLUMN avatar_url TEXT;

-- Create storage bucket for player avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-avatars', 'player-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for player avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'player-avatars');

CREATE POLICY "Club owners can upload player avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'player-avatars' AND
  EXISTS (
    SELECT 1 FROM players p
    JOIN categories c ON c.id = p.category_id
    JOIN clubs cl ON cl.id = c.club_id
    WHERE cl.user_id = auth.uid()
    AND (storage.foldername(storage.objects.name))[1] = p.id::text
  )
);

CREATE POLICY "Club owners can update player avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'player-avatars' AND
  EXISTS (
    SELECT 1 FROM players p
    JOIN categories c ON c.id = p.category_id
    JOIN clubs cl ON cl.id = c.club_id
    WHERE cl.user_id = auth.uid()
    AND (storage.foldername(storage.objects.name))[1] = p.id::text
  )
);

CREATE POLICY "Club owners can delete player avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'player-avatars' AND
  EXISTS (
    SELECT 1 FROM players p
    JOIN categories c ON c.id = p.category_id
    JOIN clubs cl ON cl.id = c.club_id
    WHERE cl.user_id = auth.uid()
    AND (storage.foldername(storage.objects.name))[1] = p.id::text
  )
);