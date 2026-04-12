
-- Add library_exercise_id to prophylaxis_exercises
ALTER TABLE public.prophylaxis_exercises
ADD COLUMN library_exercise_id uuid REFERENCES public.exercise_library(id) ON DELETE SET NULL;

-- Create prophylaxis_assignments table for multi-player assignment with calendar dates
CREATE TABLE public.prophylaxis_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES public.prophylaxis_programs(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_id, player_id)
);

ALTER TABLE public.prophylaxis_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view prophylaxis assignments in their categories"
  ON public.prophylaxis_assignments FOR SELECT
  USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can create prophylaxis assignments in their categories"
  ON public.prophylaxis_assignments FOR INSERT
  WITH CHECK (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can update prophylaxis assignments in their categories"
  ON public.prophylaxis_assignments FOR UPDATE
  USING (can_access_category(auth.uid(), category_id));

CREATE POLICY "Users can delete prophylaxis assignments in their categories"
  ON public.prophylaxis_assignments FOR DELETE
  USING (can_access_category(auth.uid(), category_id));
