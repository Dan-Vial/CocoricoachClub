-- Ajouter la colonne logo_url à la table clubs
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Créer un bucket storage pour les logos de clubs
INSERT INTO storage.buckets (id, name, public)
VALUES ('club-logos', 'club-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS pour le bucket logos
CREATE POLICY "Club logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'club-logos');

CREATE POLICY "Club owners can upload their club logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'club-logos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Club owners can update their club logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'club-logos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Club owners can delete their club logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'club-logos' 
  AND auth.uid() IS NOT NULL
);