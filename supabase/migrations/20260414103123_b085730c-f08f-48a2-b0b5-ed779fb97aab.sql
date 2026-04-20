CREATE TABLE public.fis_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  deadline DATE,
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fis_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fis_objectives in their categories"
ON public.fis_objectives FOR SELECT TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

CREATE POLICY "Staff can manage fis_objectives"
ON public.fis_objectives FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON cl.id = c.club_id
    WHERE c.id = category_id
    AND public.can_modify_club_data(auth.uid(), cl.id)
  )
);

CREATE TRIGGER update_fis_objectives_updated_at
BEFORE UPDATE ON public.fis_objectives
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();