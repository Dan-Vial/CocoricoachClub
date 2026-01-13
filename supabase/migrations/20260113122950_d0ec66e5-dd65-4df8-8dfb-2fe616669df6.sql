-- Table for detailed gym session exercises
CREATE TABLE public.gym_session_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  exercise_category TEXT, -- ex: 'upper_body', 'lower_body', 'core', 'cardio'
  sets INTEGER NOT NULL DEFAULT 1,
  reps INTEGER,
  weight_kg DECIMAL(6,2),
  rest_seconds INTEGER,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  tempo TEXT, -- ex: '3-1-2-0' for eccentric-pause-concentric-pause
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gym_session_exercises ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view gym exercises for their clubs"
ON public.gym_session_exercises
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON c.club_id = cl.id
    LEFT JOIN public.club_members cm ON cl.id = cm.club_id
    WHERE c.id = gym_session_exercises.category_id
    AND (cl.user_id = auth.uid() OR cm.user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert gym exercises for their clubs"
ON public.gym_session_exercises
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON c.club_id = cl.id
    LEFT JOIN public.club_members cm ON cl.id = cm.club_id
    WHERE c.id = gym_session_exercises.category_id
    AND (cl.user_id = auth.uid() OR (cm.user_id = auth.uid() AND cm.role IN ('admin', 'coach')))
  )
);

CREATE POLICY "Users can update gym exercises for their clubs"
ON public.gym_session_exercises
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON c.club_id = cl.id
    LEFT JOIN public.club_members cm ON cl.id = cm.club_id
    WHERE c.id = gym_session_exercises.category_id
    AND (cl.user_id = auth.uid() OR (cm.user_id = auth.uid() AND cm.role IN ('admin', 'coach')))
  )
);

CREATE POLICY "Users can delete gym exercises for their clubs"
ON public.gym_session_exercises
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.clubs cl ON c.club_id = cl.id
    LEFT JOIN public.club_members cm ON cl.id = cm.club_id
    WHERE c.id = gym_session_exercises.category_id
    AND (cl.user_id = auth.uid() OR (cm.user_id = auth.uid() AND cm.role IN ('admin', 'coach')))
  )
);

-- Index for performance
CREATE INDEX idx_gym_exercises_session ON public.gym_session_exercises(training_session_id);
CREATE INDEX idx_gym_exercises_player ON public.gym_session_exercises(player_id);
CREATE INDEX idx_gym_exercises_category ON public.gym_session_exercises(category_id);