
CREATE TABLE public.athlete_exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  gym_exercise_id UUID REFERENCES public.gym_session_exercises(id) ON DELETE SET NULL,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  exercise_category TEXT,
  prescribed_sets INTEGER,
  prescribed_reps INTEGER,
  prescribed_percentage_1rm NUMERIC,
  actual_weight_kg NUMERIC NOT NULL,
  actual_sets INTEGER,
  actual_reps INTEGER,
  tonnage NUMERIC GENERATED ALWAYS AS (COALESCE(actual_weight_kg, 0) * COALESCE(actual_sets, 1) * COALESCE(actual_reps, 1)) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(training_session_id, player_id, exercise_name)
);

ALTER TABLE public.athlete_exercise_logs ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own logs
CREATE POLICY "Players can view own exercise logs"
ON public.athlete_exercise_logs FOR SELECT
TO authenticated
USING (
  player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
  OR public.can_access_category(auth.uid(), category_id)
);

-- Athletes can insert their own logs
CREATE POLICY "Players can insert own exercise logs"
ON public.athlete_exercise_logs FOR INSERT
TO authenticated
WITH CHECK (
  player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
  OR public.can_access_category(auth.uid(), category_id)
);

-- Athletes can update their own logs
CREATE POLICY "Players can update own exercise logs"
ON public.athlete_exercise_logs FOR UPDATE
TO authenticated
USING (
  player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
  OR public.can_access_category(auth.uid(), category_id)
);

-- Staff can manage via category access
CREATE POLICY "Staff can delete exercise logs"
ON public.athlete_exercise_logs FOR DELETE
TO authenticated
USING (public.can_access_category(auth.uid(), category_id));

-- Also allow athlete token access (for portal)
CREATE POLICY "Athlete token holders can insert exercise logs"
ON public.athlete_exercise_logs FOR INSERT
TO anon
WITH CHECK (public.has_valid_athlete_token_for_player(player_id));

CREATE POLICY "Athlete token holders can view exercise logs"
ON public.athlete_exercise_logs FOR SELECT
TO anon
USING (public.has_valid_athlete_token_for_player(player_id));
