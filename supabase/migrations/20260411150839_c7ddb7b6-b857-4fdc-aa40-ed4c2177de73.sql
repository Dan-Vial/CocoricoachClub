CREATE TABLE public.periodization_saved_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, color)
);

ALTER TABLE public.periodization_saved_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view saved colors"
ON public.periodization_saved_colors FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert saved colors"
ON public.periodization_saved_colors FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete saved colors"
ON public.periodization_saved_colors FOR DELETE
TO authenticated
USING (true);