
CREATE TABLE public.category_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.category_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Category members can view photos"
ON public.category_photos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.category_members cm
    WHERE cm.category_id = category_photos.category_id AND cm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.club_members clm
    JOIN public.categories cat ON cat.club_id = clm.club_id
    WHERE cat.id = category_photos.category_id AND clm.user_id = auth.uid()
  )
);

CREATE POLICY "Category members can insert photos"
ON public.category_photos FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by
  AND (
    EXISTS (
      SELECT 1 FROM public.category_members cm
      WHERE cm.category_id = category_photos.category_id AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.club_members clm
      JOIN public.categories cat ON cat.club_id = clm.club_id
      WHERE cat.id = category_photos.category_id AND clm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Photo owner or admin can delete"
ON public.category_photos FOR DELETE
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.club_members clm
    JOIN public.categories cat ON cat.club_id = clm.club_id
    WHERE cat.id = category_photos.category_id
    AND clm.user_id = auth.uid()
    AND clm.role = 'admin'
  )
);

INSERT INTO storage.buckets (id, name, public) VALUES ('category-photos', 'category-photos', true);

CREATE POLICY "Anyone can view category photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-photos');

CREATE POLICY "Authenticated users can upload category photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'category-photos');

CREATE POLICY "Users can delete their own category photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'category-photos');
