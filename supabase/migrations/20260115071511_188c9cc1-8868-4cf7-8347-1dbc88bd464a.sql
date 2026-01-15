-- Table pour les programmes d'entraînement
CREATE TABLE public.training_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  level TEXT DEFAULT 'intermediate', -- beginner, intermediate, advanced
  is_active BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les semaines du programme
CREATE TABLE public.program_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL DEFAULT 1,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les séances dans une semaine
CREATE TABLE public.program_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id UUID NOT NULL REFERENCES public.program_weeks(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL DEFAULT 1,
  name TEXT DEFAULT 'Séance',
  day_of_week INTEGER, -- 1-7 for Monday-Sunday
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les exercices dans une séance (avec support superset/triset)
CREATE TABLE public.program_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.program_sessions(id) ON DELETE CASCADE,
  library_exercise_id UUID REFERENCES public.exercise_library(id),
  exercise_name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  method TEXT DEFAULT 'normal', -- normal, superset, triset, dropset, pyramid_up, pyramid_down
  sets INTEGER DEFAULT 3,
  reps TEXT DEFAULT '10', -- Can be "10" or "10-12" or "8,10,12"
  percentage_1rm INTEGER,
  tempo TEXT, -- e.g., "3-1-2-0"
  rest_seconds INTEGER DEFAULT 90,
  group_id UUID, -- Pour lier les exercices en superset/triset
  group_order INTEGER, -- Position dans le groupe (1/3, 2/3, 3/3)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour l'assignation des programmes aux joueurs
CREATE TABLE public.program_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(program_id, player_id)
);

-- Enable RLS
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_programs
CREATE POLICY "Users can view programs for their categories"
ON public.training_programs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.category_members cm
    WHERE cm.category_id = training_programs.category_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create programs for their categories"
ON public.training_programs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.category_members cm
    WHERE cm.category_id = training_programs.category_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'coach')
  )
);

CREATE POLICY "Users can update programs for their categories"
ON public.training_programs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.category_members cm
    WHERE cm.category_id = training_programs.category_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'coach')
  )
);

CREATE POLICY "Users can delete programs for their categories"
ON public.training_programs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.category_members cm
    WHERE cm.category_id = training_programs.category_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'coach')
  )
);

-- RLS Policies for program_weeks
CREATE POLICY "Users can manage program weeks"
ON public.program_weeks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.training_programs tp
    JOIN public.category_members cm ON cm.category_id = tp.category_id
    WHERE tp.id = program_weeks.program_id
    AND cm.user_id = auth.uid()
  )
);

-- RLS Policies for program_sessions
CREATE POLICY "Users can manage program sessions"
ON public.program_sessions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.program_weeks pw
    JOIN public.training_programs tp ON tp.id = pw.program_id
    JOIN public.category_members cm ON cm.category_id = tp.category_id
    WHERE pw.id = program_sessions.week_id
    AND cm.user_id = auth.uid()
  )
);

-- RLS Policies for program_exercises
CREATE POLICY "Users can manage program exercises"
ON public.program_exercises FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.program_sessions ps
    JOIN public.program_weeks pw ON pw.id = ps.week_id
    JOIN public.training_programs tp ON tp.id = pw.program_id
    JOIN public.category_members cm ON cm.category_id = tp.category_id
    WHERE ps.id = program_exercises.session_id
    AND cm.user_id = auth.uid()
  )
);

-- RLS Policies for program_assignments
CREATE POLICY "Users can manage program assignments"
ON public.program_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.training_programs tp
    JOIN public.category_members cm ON cm.category_id = tp.category_id
    WHERE tp.id = program_assignments.program_id
    AND cm.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_training_programs_updated_at
BEFORE UPDATE ON public.training_programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();