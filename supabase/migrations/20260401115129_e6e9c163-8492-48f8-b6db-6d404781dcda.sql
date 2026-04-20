CREATE TABLE public.player_rehab_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_rehab_protocol_id UUID NOT NULL REFERENCES public.player_rehab_protocols(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.protocol_phases(id) ON DELETE SET NULL,
  phase_number INTEGER NOT NULL DEFAULT 1,
  source_exercise_id UUID REFERENCES public.protocol_exercises(id) ON DELETE SET NULL,
  exercise_library_id UUID REFERENCES public.exercise_library(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  sets INTEGER,
  reps TEXT,
  duration TEXT,
  frequency TEXT,
  exercise_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  video_url TEXT,
  notes TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.player_rehab_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view player rehab exercises via category"
  ON public.player_rehab_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.player_rehab_protocols prp
      WHERE prp.id = player_rehab_protocol_id
        AND public.can_access_category(auth.uid(), prp.category_id)
    )
  );

CREATE POLICY "Staff can manage player rehab exercises"
  ON public.player_rehab_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.player_rehab_protocols prp
      JOIN public.categories c ON c.id = prp.category_id
      WHERE prp.id = player_rehab_protocol_id
        AND (
          public.can_modify_club_data(auth.uid(), c.club_id)
          OR public.has_medical_access(auth.uid(), c.club_id)
        )
    )
  );

CREATE TRIGGER update_player_rehab_exercises_updated_at
  BEFORE UPDATE ON public.player_rehab_exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();